import { invokeLLM } from "./_core/llm";
import type { Email, CalendarEvent, UserNote } from "../drizzle/schema";

export interface BriefingInput {
  emails: Email[];
  calendarEvents: CalendarEvent[];
  userNotes: UserNote[];
  userName: string;
}

export async function generateBriefing(input: BriefingInput): Promise<string> {
  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Format emails for the prompt
  const emailsText = input.emails
    .map((e) => `Da: ${e.from}\nOggetto: ${e.subject}\nAnteprima: ${e.snippet}`)
    .join("\n---\n");

  // Format calendar events for the prompt
  const eventsText = input.calendarEvents
    .map((e) => {
      const startTime = new Date(e.startTime).toLocaleString("it-IT");
      const endTime = e.endTime ? new Date(e.endTime).toLocaleString("it-IT") : "TBD";
      return `${e.title}\nData/Ora: ${startTime} - ${endTime}\nLuogo: ${e.location || "Non specificato"}\nDescrizione: ${e.description || "Nessuna"}`;
    })
    .join("\n---\n");

  // Format user notes
  const notesText = input.userNotes.map((n) => n.content).join("\n");

  const prompt = `Sei la segretaria personale di ${input.userName}. Oggi è ${today}.

EVENTI CALENDARIO (prossimi 7 giorni):
${eventsText || "Nessun evento inserito."}

EMAIL RILEVANTI:
${emailsText || "Nessuna email inserita."}

NOTE PERSONALI / APPUNTI:
${notesText || "Nessuna nota inserita."}

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

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Sei un assistente personale esperto nel creare briefing strutturati e actionable. Rispondi sempre in italiano.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }

    return "Errore nella generazione del briefing.";
  } catch (error) {
    console.error("[Briefing] Error generating briefing:", error);
    throw error;
  }
}
