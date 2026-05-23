/**
 * server/google.ts
 *
 * Gestisce:
 *  1. Google OAuth2 flow (connetti / callback / disconnetti / status)
 *  2. Sincronizzazione Gmail (ultimi 7 giorni, email importanti)
 *  3. Sincronizzazione Google Calendar (eventi prossimi 7 giorni)
 *  4. Proxy per le chiamate all'API Anthropic (nasconde la key dal frontend)
 *
 * FIX #1 — La API key Anthropic non è mai esposta al browser.
 * FIX #2 — I token Google sono salvati nel DB con refresh automatico.
 * FIX #3 — access_type=offline + prompt=consent garantisce il refresh_token.
 *
 * Variabili d'ambiente richieste (.env):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_OAUTH_REDIRECT_URI   es: https://tuodominio.com/api/google/callback
 *   ANTHROPIC_API_KEY
 *   DATABASE_URL
 */

import express from "express";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";
import { googleTokens } from "../drizzle/schema"; // vedi schema.ts sotto
import { eq } from "drizzle-orm";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// SETUP CLIENT OAUTH — UN SOLO SINGLETON condiviso tra tutte le route
// FIX #4: un solo OAuth2Client evita la desincronizzazione dei token
// ─────────────────────────────────────────────────────────────────────────────
function createOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

// Scope necessari: Gmail (readonly) + Calendar (readonly)
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: carica e aggiorna i token dal DB per un utente
// ─────────────────────────────────────────────────────────────────────────────
async function getAuthClientForUser(userId: number): Promise<OAuth2Client | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, userId))
    .limit(1);

  if (!rows.length) return null;

  const tokenRow = rows[0];
  const client = createOAuthClient();

  client.setCredentials({
    access_token: tokenRow.accessToken,
    refresh_token: tokenRow.refreshToken,
    expiry_date: tokenRow.expiryDate ? Number(tokenRow.expiryDate) : undefined,
  });

  // Rinnova automaticamente il token se scaduto
  client.on("tokens", async (tokens) => {
    const db = await getDb();
    if (!db) return;
    await db
      .update(googleTokens)
      .set({
        accessToken: tokens.access_token ?? tokenRow.accessToken,
        expiryDate: tokens.expiry_date ? String(tokens.expiry_date) : tokenRow.expiryDate,
      })
      .where(eq(googleTokens.userId, userId));
  });

  return client;
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE: verifica che l'utente sia loggato nella sessione Manus
// ─────────────────────────────────────────────────────────────────────────────
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!(req as any).user) {
    return res.status(401).json({ error: "Non autenticato" });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/google/status — controlla se l'utente ha i token Google salvati
// ─────────────────────────────────────────────────────────────────────────────
router.get("/status", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const db = await getDb();
    if (!db) return res.json({ connected: false });

    const rows = await db
      .select()
      .from(googleTokens)
      .where(eq(googleTokens.userId, userId))
      .limit(1);

    res.json({ connected: rows.length > 0 && !!rows[0].refreshToken });
  } catch (e) {
    res.json({ connected: false });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/google/auth — genera l'URL OAuth e redirige l'utente a Google
// FIX #3: access_type=offline + prompt=consent garantisce il refresh_token
// ─────────────────────────────────────────────────────────────────────────────
router.get("/auth", requireAuth, (req, res) => {
  const client = createOAuthClient();

  const url = client.generateAuthUrl({
    access_type: "offline",   // ← ESSENZIALE per ottenere il refresh_token
    prompt: "consent",        // ← ESSENZIALE: forza Google a restituire sempre refresh_token
    scope: GOOGLE_SCOPES,
    state: String((req as any).user.id), // passato al callback per identificare l'utente
  });

  res.redirect(url);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/google/callback — Google redirige qui con il codice di autorizzazione
// FIX #2: i token vengono salvati nel DB (accessToken, refreshToken, expiryDate)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/callback", async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  // Gestione errore esplicito da Google (es. utente ha annullato)
  if (oauthError) {
    console.error("[Google OAuth] Errore callback:", oauthError);
    return res.redirect("/?google_error=" + encodeURIComponent(String(oauthError)));
  }

  if (!code || !state) {
    return res.redirect("/?google_error=missing_params");
  }

  const userId = parseInt(String(state), 10);
  if (isNaN(userId)) {
    return res.redirect("/?google_error=invalid_state");
  }

  try {
    const client = createOAuthClient();

    // Scambia il codice con access_token + refresh_token
    const { tokens } = await client.getToken(String(code));

    if (!tokens.refresh_token) {
      // Succede se l'utente aveva già autorizzato senza prompt=consent.
      // Con prompt=consent questo caso non dovrebbe verificarsi.
      console.warn("[Google OAuth] Nessun refresh_token ricevuto per userId:", userId);
    }

    // Salva i token nel DB
    const db = await getDb();
    if (!db) throw new Error("DB non disponibile");

    await db
      .insert(googleTokens)
      .values({
        userId,
        accessToken: tokens.access_token ?? "",
        refreshToken: tokens.refresh_token ?? null,
        expiryDate: tokens.expiry_date ? String(tokens.expiry_date) : null,
      })
      .onDuplicateKeyUpdate({
        set: {
          accessToken: tokens.access_token ?? "",
          // Solo aggiorna refreshToken se Google ne ha restituito uno nuovo
          ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
          expiryDate: tokens.expiry_date ? String(tokens.expiry_date) : null,
        },
      });

    // Torna alla dashboard con indicatore di successo
    res.redirect("/?google_connected=1");
  } catch (e: any) {
    console.error("[Google OAuth] Errore callback:", e);
    res.redirect("/?google_error=" + encodeURIComponent(e.message || "unknown"));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/google/disconnect — rimuove i token dal DB
// ─────────────────────────────────────────────────────────────────────────────
router.post("/disconnect", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const db = await getDb();
    if (!db) return res.json({ success: true });

    await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/google/calendar/sync — legge i prossimi 7 giorni di eventi
// ─────────────────────────────────────────────────────────────────────────────
router.get("/calendar/sync", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const auth = await getAuthClientForUser(userId);
    if (!auth) {
      return res.status(401).json({ error: "Google non connesso. Autorizza prima dall'app." });
    }

    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: in7Days.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });

    const events = response.data.items || [];

    if (events.length === 0) {
      return res.json({ count: 0, text: "Nessun evento nei prossimi 7 giorni." });
    }

    // Formatta gli eventi come testo leggibile per il briefing
    const text = events
      .map(event => {
        const start = event.start?.dateTime || event.start?.date || "";
        const end = event.end?.dateTime || event.end?.date || "";
        const startDate = new Date(start);
        const dateStr = startDate.toLocaleDateString("it-IT", {
          weekday: "long", day: "numeric", month: "long",
        });
        const timeStr = event.start?.dateTime
          ? startDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
          : "tutto il giorno";

        const location = event.location ? ` — ${event.location}` : "";
        const description = event.description
          ? `\n  Note: ${event.description.slice(0, 150)}`
          : "";

        return `${dateStr} ore ${timeStr}: ${event.summary || "Senza titolo"}${location}${description}`;
      })
      .join("\n");

    res.json({ count: events.length, text });
  } catch (e: any) {
    console.error("[Calendar Sync]", e);
    // Token scaduto e non rinnovabile → chiedi di riconnettersi
    if (e.code === 401) {
      return res.status(401).json({ error: "Token Google scaduto. Riconnetti Google dall'app." });
    }
    res.status(500).json({ error: e.message || "Errore sincronizzazione calendario" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/google/gmail/sync — legge le email importanti degli ultimi 7 giorni
// ─────────────────────────────────────────────────────────────────────────────
router.get("/gmail/sync", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const auth = await getAuthClientForUser(userId);
    if (!auth) {
      return res.status(401).json({ error: "Google non connesso. Autorizza prima dall'app." });
    }

    const gmail = google.gmail({ version: "v1", auth });

    // Cerca email non lette o importanti degli ultimi 7 giorni, esclude spam/trash
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const query = `(is:unread OR is:important) after:${sevenDaysAgo} -in:spam -in:trash`;

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 15,
    });

    const messages = listResponse.data.messages || [];

    if (messages.length === 0) {
      return res.json({ count: 0, text: "Nessuna email importante negli ultimi 7 giorni." });
    }

    // Legge i dettagli di ogni email
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = detail.data.payload?.headers || [];
        const subject = headers.find(h => h.name === "Subject")?.value || "(senza oggetto)";
        const from = headers.find(h => h.name === "From")?.value || "Mittente sconosciuto";
        const date = headers.find(h => h.name === "Date")?.value || "";

        // Estrai nome mittente se disponibile
        const fromName = from.replace(/<.*>/, "").trim() || from;
        const dateFormatted = date
          ? new Date(date).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })
          : "";

        // Prendi un snippet del corpo
        const snippet = detail.data.snippet
          ? detail.data.snippet.slice(0, 120) + "..."
          : "";

        return `Da ${fromName} (${dateFormatted}): ${subject}\n  ${snippet}`;
      })
    );

    const text = emailDetails.join("\n\n");
    res.json({ count: messages.length, text });
  } catch (e: any) {
    console.error("[Gmail Sync]", e);
    if (e.code === 401) {
      return res.status(401).json({ error: "Token Google scaduto. Riconnetti Google dall'app." });
    }
    res.status(500).json({ error: e.message || "Errore sincronizzazione Gmail" });
  }
});

export default router;

// ─────────────────────────────────────────────────────────────────────────────
// PROXY ANTHROPIC — da registrare separatamente in server/_core/index.ts
//
// POST /api/briefing/generate
// FIX #1: la ANTHROPIC_API_KEY rimane server-side, mai esposta al browser
// ─────────────────────────────────────────────────────────────────────────────
export async function briefingProxyHandler(
  req: express.Request,
  res: express.Response
) {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt mancante" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurata sul server" });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter(b => b.type === "text")
      .map(b => (b as any).text)
      .join("");

    res.json({ text });
  } catch (e: any) {
    console.error("[Briefing Proxy]", e);
    res.status(500).json({ error: e.message || "Errore generazione briefing" });
  }
}
