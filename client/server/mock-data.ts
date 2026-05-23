/**
 * Mock data generator for testing without Google OAuth
 * Generates realistic sample emails, calendar events, and briefings
 */

export interface MockEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: Date;
}

export interface MockCalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
}

export interface MockNote {
  content: string;
}

export function generateMockEmails(): MockEmail[] {
  const now = new Date();
  return [
    {
      id: "mock-email-1",
      from: "boss@company.com",
      subject: "Riunione progetto Q2 - Urgente",
      snippet: "Abbiamo ricevuto il feedback del cliente. Dobbiamo discutere della strategia di implementazione...",
      date: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: "mock-email-2",
      from: "team@company.com",
      subject: "Update Sprint 15 - Completato",
      snippet: "Sprint 15 è stato completato con successo. Tutti gli task sono stati chiusi. Prossimo sprint inizia lunedì...",
      date: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
    {
      id: "mock-email-3",
      from: "client@external.com",
      subject: "Feedback sulla presentazione",
      snippet: "Grazie per la presentazione di ieri. Abbiamo alcune domande sulla timeline e sul budget...",
      date: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      id: "mock-email-4",
      from: "hr@company.com",
      subject: "Reminder: Performance Review",
      snippet: "Ricordati che la tua performance review è programmata per domani alle 14:00. Porta i tuoi documenti...",
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: "mock-email-5",
      from: "newsletter@tech.com",
      subject: "Tech News Weekly #42",
      snippet: "Questa settimana: nuove feature di React 19, aggiornamenti su AI, e best practices per TypeScript...",
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  ];
}

export function generateMockCalendarEvents(): MockCalendarEvent[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return [
    {
      id: "mock-event-1",
      title: "Standup Team",
      description: "Daily standup meeting",
      start: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM
      end: new Date(today.getTime() + 9.5 * 60 * 60 * 1000), // 9:30 AM
      location: "Meeting Room A",
    },
    {
      id: "mock-event-2",
      title: "Performance Review",
      description: "1-on-1 with manager",
      start: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2:00 PM
      end: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 3:00 PM
      location: "Office - Manager's desk",
    },
    {
      id: "mock-event-3",
      title: "Client Presentation",
      description: "Q2 Strategy & Budget Review",
      start: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Tomorrow 10:00 AM
      end: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000 + 11.5 * 60 * 60 * 1000), // Tomorrow 11:30 AM
      location: "Zoom",
    },
    {
      id: "mock-event-4",
      title: "Sprint Planning",
      description: "Plan Sprint 16 tasks",
      start: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Day after tomorrow 2:00 PM
      end: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // Day after tomorrow 4:00 PM
      location: "Meeting Room B",
    },
    {
      id: "mock-event-5",
      title: "Team Lunch",
      description: "Casual team gathering",
      start: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // 3 days from now 12:00 PM
      end: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000), // 3 days from now 1:00 PM
      location: "Downtown Restaurant",
    },
  ];
}

export function generateMockNotes(): MockNote[] {
  return [
    {
      content: "Preparare presentazione con grafici aggiornati per il cliente",
    },
    {
      content: "Rivedere budget Q2 prima della riunione",
    },
    {
      content: "Seguire up con team su implementazione feature X",
    },
  ];
}

export function generateMockBriefing(userName: string = "Marco"): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return `## 📋 Panoramica del Giorno

Buongiorno ${userName}! Oggi è **${dateStr}**. Hai **3 email importanti** e **5 eventi** in agenda. La giornata sarà piuttosto intensa con la performance review e la preparazione per la presentazione del cliente.

---

## 📅 Agenda Settimana

**Oggi:**
- 09:00 - Standup Team (Meeting Room A)
- 14:00 - Performance Review (Manager's desk)

**Domani:**
- 10:00 - Client Presentation (Zoom)

**Dopodomani:**
- 14:00 - Sprint Planning (Meeting Room B)

**Tra 3 giorni:**
- 12:00 - Team Lunch (Downtown Restaurant)

---

## ⏱️ Timeline di Preparazione

1. **Subito (entro 30 min)**: Rivedi l'email del cliente sul feedback della presentazione. Prepara le risposte alle domande su timeline e budget.

2. **Mattina (entro 11:00)**: Partecipa allo standup team. Aggiorna il team sullo stato del Sprint 15.

3. **Prima del pranzo (entro 13:00)**: Raccogli i documenti per la performance review. Prepara gli esempi di progetti completati.

4. **Pomeriggio (14:00-15:00)**: Performance review con il manager.

5. **Sera**: Prepara i grafici aggiornati per la presentazione del cliente di domani.

---

## ⚡ Azioni Urgenti

- **🔴 CRITICO**: Rispondere al cliente entro oggi sulle domande su timeline e budget
- **🟠 IMPORTANTE**: Preparare grafici aggiornati per presentazione domani
- **🟠 IMPORTANTE**: Rivedere budget Q2 prima della riunione
- **🟡 NORMALE**: Seguire up con team su implementazione feature X

---

## 📄 Documenti e Materiali

- Email cliente: "Feedback sulla presentazione" - contiene 3 domande specifiche
- Sprint 15 Report - disponibile nel sistema
- Q2 Budget Draft - cartella condivisa
- Presentazione Template - ultimo aggiornamento 2 giorni fa

---

## 🔔 Segnalazioni

✅ **Positivo**: Sprint 15 completato con successo, tutti i task chiusi
⚠️ **Attenzione**: Cliente in attesa di risposte - rispondere entro oggi
ℹ️ **Info**: Prossimo sprint inizia lunedì
`;
}
