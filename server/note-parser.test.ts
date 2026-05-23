import { describe, it, expect } from "vitest";
import { parseNote, formatParsedDateTime, isDateInFuture } from "./note-parser";

describe("Note Parser", () => {
  it("should parse note with 'domani HH:MM' format", () => {
    const result = parseNote("Riunione domani 14:00");
    expect(result.title).toBe("Riunione");
    expect(result.hasDateTime).toBe(true);
    expect(result.dateTime).toBeDefined();
    if (result.dateTime) {
      expect(result.dateTime.getHours()).toBe(14);
      expect(result.dateTime.getMinutes()).toBe(0);
    }
  });

  it("should parse note with 'oggi HH:MM' format", () => {
    const result = parseNote("Pranzo oggi 12:30");
    expect(result.title).toBe("Pranzo");
    expect(result.hasDateTime).toBe(true);
    expect(result.dateTime).toBeDefined();
    if (result.dateTime) {
      expect(result.dateTime.getHours()).toBe(12);
      expect(result.dateTime.getMinutes()).toBe(30);
    }
  });

  it("should parse note with day name and time", () => {
    const result = parseNote("Meeting lunedì 10:00");
    expect(result.title).toBe("Meeting");
    expect(result.hasDateTime).toBe(true);
    expect(result.dateTime).toBeDefined();
  });

  it("should parse note with ISO date format", () => {
    const result = parseNote("Appuntamento 2026-05-20 15:30");
    expect(result.title).toBe("Appuntamento");
    expect(result.hasDateTime).toBe(true);
    expect(result.dateTime).toBeDefined();
    if (result.dateTime) {
      expect(result.dateTime.getFullYear()).toBe(2026);
      expect(result.dateTime.getMonth()).toBe(4); // May is 4 (0-indexed)
      expect(result.dateTime.getDate()).toBe(20);
    }
  });

  it("should parse note with time only (today)", () => {
    const result = parseNote("Telefonata 16:00");
    expect(result.title).toBe("Telefonata");
    expect(result.hasDateTime).toBe(true);
    expect(result.dateTime).toBeDefined();
    if (result.dateTime) {
      expect(result.dateTime.getHours()).toBe(16);
    }
  });

  it("should handle note without date/time", () => {
    const result = parseNote("Ricordati di comprare il latte");
    expect(result.title).toBe("Ricordati di comprare il latte");
    expect(result.hasDateTime).toBe(false);
    expect(result.dateTime).toBeUndefined();
  });

  it("should format parsed datetime correctly", () => {
    const date = new Date(2026, 4, 20, 14, 30); // May 20, 2026 at 14:30
    const formatted = formatParsedDateTime(date);
    expect(formatted).toContain("14:30");
    expect(formatted).toContain("2026");
  });

  it("should validate if date is in future", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    expect(isDateInFuture(futureDate)).toBe(true);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    expect(isDateInFuture(pastDate)).toBe(false);
  });
});
