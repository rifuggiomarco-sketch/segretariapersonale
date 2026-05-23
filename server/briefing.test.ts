import { describe, it, expect, vi } from "vitest";
import { generateBriefing } from "./briefing";
import * as llm from "./_core/llm";

vi.mock("./_core/llm");

describe("generateBriefing", () => {
  it("should generate a briefing with all sections", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: `## PANORAMICA DEL GIORNO
Oggi è una giornata importante con due riunioni.

## AGENDA SETTIMANA
- Lunedì: Riunione con Marco
- Martedì: Presentazione progetto

## TIMELINE DI PREPARAZIONE
Preparare i documenti oggi.

## AZIONI URGENTI
- Inviare email a Marco
- Preparare slide

## DOCUMENTI E MATERIALI
- Contratto.pdf
- Presentazione.pptx

## SEGNALAZIONI
Scadenza progetto venerdì.`,
          },
        },
      ],
    };

    vi.mocked(llm.invokeLLM).mockResolvedValue(mockResponse as any);

    const result = await generateBriefing({
      emails: [
        {
          id: 1,
          userId: 1,
          gmailId: "123",
          from: "marco@example.com",
          subject: "Riunione",
          snippet: "Ci vediamo domani",
          body: null,
          receivedAt: new Date(),
          syncedAt: new Date(),
          createdAt: new Date(),
        },
      ],
      calendarEvents: [
        {
          id: 1,
          userId: 1,
          googleEventId: "456",
          title: "Riunione con Marco",
          description: "Discussione progetto",
          startTime: new Date(),
          endTime: new Date(),
          location: "Ufficio",
          syncedAt: new Date(),
          createdAt: new Date(),
        },
      ],
      userNotes: [
        {
          id: 1,
          userId: 1,
          content: "Portare documenti",
          forDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      userName: "Marco",
    });

    expect(result).toContain("PANORAMICA DEL GIORNO");
    expect(result).toContain("AGENDA SETTIMANA");
    expect(result).toContain("TIMELINE DI PREPARAZIONE");
    expect(result).toContain("AZIONI URGENTI");
    expect(result).toContain("DOCUMENTI E MATERIALI");
    expect(result).toContain("SEGNALAZIONI");
  });

  it("should handle empty data gracefully", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: "## PANORAMICA DEL GIORNO\nNessun evento inserito.",
          },
        },
      ],
    };

    vi.mocked(llm.invokeLLM).mockResolvedValue(mockResponse as any);

    const result = await generateBriefing({
      emails: [],
      calendarEvents: [],
      userNotes: [],
      userName: "Marco",
    });

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});
