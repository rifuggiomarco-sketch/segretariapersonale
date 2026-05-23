import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; color: #f0ede6; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
  .app { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #0f0f0f; }
  .header { padding: 48px 24px 24px; border-bottom: 1px solid #1e1e1e; }
  .header-label { font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #e8c547; margin-bottom: 8px; font-weight: 500; }
  .header-title { font-family: 'Bebas Neue', sans-serif; font-size: 52px; line-height: 0.9; color: #f0ede6; }
  .header-title span { color: #e8c547; }
  .header-sub { font-size: 12px; color: #555; margin-top: 12px; font-weight: 300; }
  .date-bar { padding: 16px 24px; background: #141414; border-bottom: 1px solid #1e1e1e; font-size: 12px; color: #777; letter-spacing: 1px; }
  .date-bar strong { color: #e8c547; }

  /* ── Google Auth Banner ── */
  .google-banner { margin: 20px 24px 0; padding: 16px; border: 1px solid #2a2a2a; background: #141414; }
  .google-banner.connected { border-color: #2a4a2a; background: #0d1f0d; }
  .google-banner-header { display: flex; align-items: center; justify-content: space-between; }
  .google-banner-title { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #e8c547; font-weight: 500; }
  .google-status { font-size: 11px; color: #555; margin-top: 6px; }
  .google-status.ok { color: #4a9a4a; }
  .google-btn { padding: 8px 16px; background: #e8c547; color: #0a0a0a; border: none; font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
  .google-btn:hover { background: #f5d55c; }
  .google-btn.disconnect { background: transparent; border: 1px solid #3a2020; color: #cc4444; font-size: 11px; letter-spacing: 1px; font-family: 'DM Sans', sans-serif; padding: 6px 12px; }
  .google-btn.disconnect:hover { background: #1a0a0a; }
  .sync-row { display: flex; gap: 8px; margin-top: 12px; }
  .sync-btn { flex: 1; padding: 8px; background: transparent; border: 1px solid #2a2a2a; color: #777; font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
  .sync-btn:hover:not(:disabled) { border-color: #e8c547; color: #e8c547; }
  .sync-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sync-result { font-size: 11px; color: #4a9a4a; margin-top: 6px; }
  .sync-error { font-size: 11px; color: #cc4444; margin-top: 6px; }

  .section { margin: 20px 24px 0; }
  .section-label { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #e8c547; margin-bottom: 8px; font-weight: 500; }
  textarea { width: 100%; background: #141414; border: 1px solid #2a2a2a; color: #c8c5be; padding: 12px; font-family: 'DM Sans', sans-serif; resize: vertical; outline: none; font-size: 13px; line-height: 1.6; }
  textarea:focus { border-color: #e8c547; }
  .hint { font-size: 11px; color: #444; margin-top: 6px; line-height: 1.5; }
  .scan-btn { margin: 24px; width: calc(100% - 48px); padding: 18px; background: #e8c547; color: #0a0a0a; border: none; font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; cursor: pointer; transition: all 0.2s; clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px)); }
  .scan-btn:hover:not(:disabled) { background: #f5d55c; transform: translateY(-1px); }
  .scan-btn:disabled { background: #2a2a2a; color: #555; cursor: not-allowed; transform: none; }
  .loading-area { padding: 24px; }
  .loading-step { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #1a1a1a; font-size: 13px; color: #555; transition: color 0.3s; }
  .loading-step.done { color: #e8c547; }
  .loading-step.active { color: #f0ede6; }
  .step-dot { width: 6px; height: 6px; border-radius: 50%; background: #2a2a2a; flex-shrink: 0; transition: background 0.3s; }
  .loading-step.done .step-dot { background: #e8c547; }
  .loading-step.active .step-dot { background: #f0ede6; box-shadow: 0 0 8px #f0ede6; animation: pulse 1s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .briefing { padding: 0 24px 48px; }
  .briefing-header { font-family: 'Bebas Neue', sans-serif; font-size: 13px; letter-spacing: 4px; color: #e8c547; padding: 24px 0 16px; border-bottom: 1px solid #1e1e1e; margin-bottom: 20px; }
  .ai-output { font-size: 14px; line-height: 1.8; color: #c8c5be; }
  .ai-output h2 { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: #f0ede6; letter-spacing: 2px; margin: 28px 0 12px; padding-top: 20px; border-top: 1px solid #1e1e1e; }
  .ai-output h2:first-child { margin-top: 0; padding-top: 0; border-top: none; }
  .ai-output h3 { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #e8c547; margin: 20px 0 8px; font-weight: 500; }
  .ai-output p { margin-bottom: 8px; }
  .ai-output ul { list-style: none; padding: 0; margin-bottom: 12px; }
  .ai-output ul li { padding: 2px 0; }
  .ai-output ul li::before { content: "→ "; color: #e8c547; }
  .ai-output strong { color: #f0ede6; font-weight: 500; }
  .empty-state { padding: 48px 24px; text-align: center; }
  .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
  .empty-text { font-size: 13px; color: #444; line-height: 1.6; }
  .error-box { margin: 24px; padding: 16px; border: 1px solid #8b2020; background: #1a0a0a; font-size: 13px; color: #cc4444; line-height: 1.6; }
  .refresh-btn { margin: 0 24px 24px; padding: 12px; background: transparent; border: 1px solid #2a2a2a; color: #555; font-family: 'DM Sans', sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; width: calc(100% - 48px); transition: all 0.2s; }
  .refresh-btn:hover { border-color: #555; color: #888; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(date) {
  return date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// FIX #3 — renderBriefing ora gestisce il grassetto **testo** inline
function renderInline(text) {
  // Divide su **...** e alterna testo normale / bold
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function renderBriefing(text) {
  const lines = text.split("\n");
  const elements = [];
  let ulBuffer = [];

  const flushUl = () => {
    if (ulBuffer.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`}>{ulBuffer}</ul>);
      ulBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flushUl();
      elements.push(<h2 key={i}>{renderInline(line.replace(/^## /, ""))}</h2>);
    } else if (line.startsWith("### ")) {
      flushUl();
      elements.push(<h3 key={i}>{renderInline(line.replace(/^### /, ""))}</h3>);
    } else if (/^[-•*] /.test(line)) {
      ulBuffer.push(<li key={i}>{renderInline(line.replace(/^[-•*] /, ""))}</li>);
    } else if (line === "") {
      flushUl();
    } else {
      flushUl();
      elements.push(<p key={i}>{renderInline(line)}</p>);
    }
  });

  flushUl();
  return elements;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX #1 — generateBriefing ora chiama il backend proxy, non Anthropic direttamente.
// Il backend (server/google.ts) riceve la richiesta e aggiunge la API key server-side.
// Fallback: se VITE_ANTHROPIC_KEY è presente nell'env (dev locale) chiama direttamente.
// ─────────────────────────────────────────────────────────────────────────────
async function generateBriefing(calendarData, emailData, telegramNotes) {
  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const prompt = `Sei la segretaria personale di Marco. Oggi è ${today}.

EVENTI CALENDARIO (prossimi 7 giorni):
${calendarData || "Nessun evento inserito."}

EMAIL RILEVANTI:
${emailData || "Nessuna email inserita."}

NOTE TELEGRAM / APPUNTI DI MARCO:
${telegramNotes || "Nessuna nota inserita."}

Genera un briefing giornaliero completo in italiano. Struttura così:

## PANORAMICA DEL GIORNO
Cosa c'è oggi e cosa è più urgente.

## AGENDA SETTIMANA
Per ogni impegno: data, ora, con chi, dove, cosa portare o preparare.

## TIMELINE DI PREPARAZIONE
Per ogni impegno importante: cosa fare oggi, il giorno prima, 3 giorni prima.

## AZIONI URGENTI
Lista prioritizzata delle cose da fare subito.

## DOCUMENTI E MATERIALI
Cosa preparare o portare per gli impegni imminenti.

## SEGNALAZIONI
Scadenze vicine, cose che potrebbero sfuggire, promemoria importanti.

Tono: professionale, diretto, pratico. Se mancano dati dillo e suggerisci come migliorare il sistema.`;

  // Prova prima il backend proxy (produzione)
  const useProxy = !import.meta.env.VITE_ANTHROPIC_KEY;

  const url = useProxy
    ? "/api/briefing/generate"
    : "https://api.anthropic.com/v1/messages";

  const headers = useProxy
    ? { "Content-Type": "application/json" }
    : {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      };

  const body = useProxy
    ? JSON.stringify({ prompt })
    : JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

  const res = await fetch(url, { method: "POST", headers, body });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // Il proxy restituisce { text: "..." }, la chiamata diretta restituisce il formato Anthropic
  if (useProxy) return data.text || "Errore: risposta vuota dal server.";
  return data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "Errore nella generazione.";
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE AUTH HOOK
// Gestisce lo stato della connessione Google e la sincronizzazione automatica
// ─────────────────────────────────────────────────────────────────────────────
function useGoogleAuth() {
  const [googleStatus, setGoogleStatus] = useState("checking"); // checking | connected | disconnected
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [syncingEmail, setSyncingEmail] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");

  // Controlla se l'utente ha già connesso Google
  useEffect(() => {
    fetch("/api/google/status", { credentials: "include" })
      .then(r => r.json())
      .then(data => setGoogleStatus(data.connected ? "connected" : "disconnected"))
      .catch(() => setGoogleStatus("disconnected"));
  }, []);

  // Avvia il flow OAuth Google — apre popup (o redirect)
  const connectGoogle = useCallback(() => {
    // Il backend genera l'URL con access_type=offline&prompt=consent
    window.location.href = "/api/google/auth";
  }, []);

  const disconnectGoogle = useCallback(() => {
    fetch("/api/google/disconnect", { method: "POST", credentials: "include" })
      .then(() => {
        setGoogleStatus("disconnected");
        setSyncMessage("");
      })
      .catch(() => setSyncError("Errore durante la disconnessione."));
  }, []);

  // Sincronizza Google Calendar → restituisce testo da incollare nel textarea
  const syncCalendar = useCallback(async () => {
    setSyncingCalendar(true);
    setSyncMessage("");
    setSyncError("");
    try {
      const res = await fetch("/api/google/calendar/sync", { credentials: "include" });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const data = await res.json();
      setSyncMessage(`✓ Calendario sincronizzato (${data.count} eventi)`);
      return data.text; // testo formattato per il textarea
    } catch (e) {
      setSyncError("Errore calendario: " + e.message);
      return null;
    } finally {
      setSyncingCalendar(false);
    }
  }, []);

  // Sincronizza Gmail → restituisce testo da incollare nel textarea
  const syncEmail = useCallback(async () => {
    setSyncingEmail(true);
    setSyncMessage("");
    setSyncError("");
    try {
      const res = await fetch("/api/google/gmail/sync", { credentials: "include" });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const data = await res.json();
      setSyncMessage(`✓ Gmail sincronizzato (${data.count} email)`);
      return data.text;
    } catch (e) {
      setSyncError("Errore Gmail: " + e.message);
      return null;
    } finally {
      setSyncingEmail(false);
    }
  }, []);

  return {
    googleStatus,
    connectGoogle,
    disconnectGoogle,
    syncCalendar,
    syncEmail,
    syncingCalendar,
    syncingEmail,
    syncMessage,
    syncError,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [status, setStatus] = useState("idle");
  const [briefing, setBriefing] = useState("");
  const [error, setError] = useState("");
  const [telegramNotes, setTelegramNotes] = useState("");
  const [calendarData, setCalendarData] = useState("");
  const [emailData, setEmailData] = useState("");

  // FIX #4 — step ora è legato agli step reali, non a timeout fittizi
  // 0=idle, 1=sync calendario, 2=sync email, 3=AI elaborazione, 4=done
  const [step, setStep] = useState(0);

  const {
    googleStatus,
    connectGoogle,
    disconnectGoogle,
    syncCalendar,
    syncEmail,
    syncingCalendar,
    syncingEmail,
    syncMessage,
    syncError,
  } = useGoogleAuth();

  // Handler per sincronizzazione calendario — riempie il textarea automaticamente
  const handleSyncCalendar = async () => {
    const text = await syncCalendar();
    if (text) setCalendarData(text);
  };

  // Handler per sincronizzazione Gmail — riempie il textarea automaticamente
  const handleSyncEmail = async () => {
    const text = await syncEmail();
    if (text) setEmailData(text);
  };

  // FIX #4 — stepList ora riflette lo stato reale del processo
  const stepList = [
    {
      label: "Lettura dati calendario",
      state: step > 1 ? "done" : step === 1 ? "active" : "waiting",
    },
    {
      label: "Analisi email",
      state: step > 2 ? "done" : step === 2 ? "active" : "waiting",
    },
    {
      label: "Elaborazione AI briefing",
      state: step > 3 ? "done" : step === 3 ? "active" : "waiting",
    },
  ];

  const run = async () => {
    setStatus("loading");
    setError("");
    setBriefing("");

    try {
      // Step 1: verifica/sync calendario (se connesso a Google)
      setStep(1);
      if (googleStatus === "connected" && !calendarData) {
        const text = await syncCalendar();
        if (text) setCalendarData(text);
      }

      // Step 2: verifica/sync email (se connesso a Google)
      setStep(2);
      if (googleStatus === "connected" && !emailData) {
        const text = await syncEmail();
        if (text) setEmailData(text);
      }

      // Step 3: generazione AI
      setStep(3);
      const result = await generateBriefing(calendarData, emailData, telegramNotes);

      setStep(4);
      setBriefing(result);
      setStatus("done");
    } catch (e) {
      // FIX #4 — in caso di errore reset step a 0, status diventa "error"
      setStep(0);
      setError("Errore: " + e.message);
      setStatus("error");
    }
  };

  const now = new Date();
  const isConnected = googleStatus === "connected";

  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* HEADER */}
        <div className="header">
          <div className="header-label">Assistente Personale</div>
          <div className="header-title">MARCO<br /><span>AGENDA</span></div>
          <div className="header-sub">Calendar · Gmail · Telegram</div>
        </div>

        <div className="date-bar">
          <strong>{formatDate(now).toUpperCase()}</strong>
        </div>

        {/* GOOGLE AUTH BANNER */}
        <div className={`google-banner${isConnected ? " connected" : ""}`}>
          <div className="google-banner-header">
            <div className="google-banner-title">🔗 Google Account</div>
            {isConnected ? (
              <button className="google-btn disconnect" onClick={disconnectGoogle}>
                Disconnetti
              </button>
            ) : (
              <button
                className="google-btn"
                onClick={connectGoogle}
                disabled={googleStatus === "checking"}
              >
                {googleStatus === "checking" ? "..." : "Connetti"}
              </button>
            )}
          </div>
          <div className={`google-status${isConnected ? " ok" : ""}`}>
            {googleStatus === "checking" && "Verifica connessione..."}
            {googleStatus === "connected" && "✓ Gmail e Calendar collegati"}
            {googleStatus === "disconnected" && "Non connesso — clicca Connetti per autorizzare Gmail e Calendar"}
          </div>

          {isConnected && (
            <div className="sync-row">
              <button
                className="sync-btn"
                onClick={handleSyncCalendar}
                disabled={syncingCalendar || syncingEmail}
              >
                {syncingCalendar ? "Sync..." : "↻ Sync Calendario"}
              </button>
              <button
                className="sync-btn"
                onClick={handleSyncEmail}
                disabled={syncingCalendar || syncingEmail}
              >
                {syncingEmail ? "Sync..." : "↻ Sync Gmail"}
              </button>
            </div>
          )}

          {syncMessage && <div className="sync-result">{syncMessage}</div>}
          {syncError && <div className="sync-error">⚠️ {syncError}</div>}
        </div>

        {/* CALENDARIO */}
        <div className="section" style={{ marginTop: 24 }}>
          <div className="section-label">📅 Eventi Calendario</div>
          <textarea
            rows={3}
            placeholder={
              isConnected
                ? "Premi «↻ Sync Calendario» per popolare automaticamente, o incolla manualmente..."
                : "Incolla gli eventi della settimana...\nes: Giovedì 22 maggio ore 11-13 — Caritas via Arcoveggio, portare carrellino"
            }
            value={calendarData}
            onChange={e => setCalendarData(e.target.value)}
          />
          {!isConnected && (
            <div className="hint">💡 Connetti Google per la sincronizzazione automatica.</div>
          )}
        </div>

        {/* EMAIL */}
        <div className="section" style={{ marginTop: 16 }}>
          <div className="section-label">✉️ Email Importanti</div>
          <textarea
            rows={3}
            placeholder={
              isConnected
                ? "Premi «↻ Sync Gmail» per popolare automaticamente, o incolla manualmente..."
                : "Incolla email rilevanti...\nes: Da Luca: ci vediamo venerdì per il preventivo"
            }
            value={emailData}
            onChange={e => setEmailData(e.target.value)}
          />
        </div>

        {/* NOTE TELEGRAM */}
        <div className="section" style={{ marginTop: 16 }}>
          <div className="section-label">✈️ Note Telegram (@marcorifuggiobot)</div>
          <textarea
            rows={3}
            placeholder={"Incolla i tuoi messaggi al bot...\nes: riunione giovedì con Luca, portare preventivo"}
            value={telegramNotes}
            onChange={e => setTelegramNotes(e.target.value)}
          />
        </div>

        {/* PULSANTE GENERA */}
        <button className="scan-btn" onClick={run} disabled={status === "loading"}>
          {status === "loading" ? "ELABORAZIONE..." : "⚡ GENERA BRIEFING"}
        </button>

        {/* LOADING STEPS — FIX #4: solo mostrati durante loading, reset su errore */}
        {status === "loading" && (
          <div className="loading-area">
            {stepList.map((s, i) => (
              <div
                key={i}
                className={`loading-step ${s.state === "done" ? "done" : s.state === "active" ? "active" : ""}`}
              >
                <div className="step-dot" />
                {s.label}{s.state === "done" && " ✓"}
              </div>
            ))}
          </div>
        )}

        {/* ERRORE */}
        {status === "error" && (
          <div className="error-box">
            ⚠️ {error}
            {error.includes("401") && (
              <><br /><br />Controlla che <code>VITE_ANTHROPIC_KEY</code> sia impostata nel file <code>.env</code>, oppure che il backend proxy sia avviato.</>
            )}
          </div>
        )}

        {/* BRIEFING GENERATO — FIX #3: bold inline funziona */}
        {status === "done" && briefing && (
          <>
            <div className="briefing">
              <div className="briefing-header">◈ BRIEFING GENERATO</div>
              <div className="ai-output">{renderBriefing(briefing)}</div>
            </div>
            <button className="refresh-btn" onClick={run}>↻ AGGIORNA BRIEFING</button>
          </>
        )}

        {/* EMPTY STATE */}
        {status === "idle" && (
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <div className="empty-text">
              {isConnected
                ? <>Premi <strong style={{ color: "#e8c547" }}>Sync</strong> per importare i dati<br />da Google, poi genera il briefing.</>
                : <>Connetti Google per la sync automatica,<br />oppure inserisci i dati manualmente<br />e premi Genera Briefing.</>
              }
            </div>
          </div>
        )}

      </div>
    </>
  );
}
