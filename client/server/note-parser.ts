/**
 * Parser per note con estrazione di data, orario e titolo evento
 * Supporta formati naturali come:
 * - "Riunione domani 14:00"
 * - "Pranzo lunedì 12:30"
 * - "Meeting 2026-05-20 10:00"
 */

import { parse, isValid, addDays, startOfToday } from "date-fns";
import { it } from "date-fns/locale";

export interface ParsedNote {
  title: string;
  description: string;
  dateTime?: Date;
  hasDateTime: boolean;
  originalText: string;
}

const dayNames: { [key: string]: number } = {
  lunedì: 1,
  martedì: 2,
  mercoledì: 3,
  giovedì: 4,
  venerdì: 5,
  sabato: 6,
  domenica: 0,
};

const dayNamesShort: { [key: string]: number } = {
  lun: 1,
  mar: 2,
  mer: 3,
  gio: 4,
  ven: 5,
  sab: 6,
  dom: 0,
};

export function parseNote(text: string): ParsedNote {
  const originalText = text.trim();
  let title = originalText;
  let dateTime: Date | undefined;
  let hasDateTime = false;

  // Pattern 1: "Testo domani/oggi HH:MM"
  const tomorrowPattern = /(.+?)\s+(domani|oggi)\s+(\d{1,2}):(\d{2})/i;
  const tomorrowMatch = text.match(tomorrowPattern);
  if (tomorrowMatch) {
    title = tomorrowMatch[1].trim();
    const hour = parseInt(tomorrowMatch[3]);
    const minute = parseInt(tomorrowMatch[4]);
    const baseDate = tomorrowMatch[2].toLowerCase() === "domani" ? addDays(startOfToday(), 1) : startOfToday();
    dateTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, minute);
    hasDateTime = true;
  }

  // Pattern 2: "Testo [lunedì/martedì/etc] HH:MM"
  if (!hasDateTime) {
    const dayPattern = new RegExp(`(.+?)\\s+(${Object.keys(dayNames).join("|")})\\s+(\\d{1,2}):(\\d{2})`, "i");
    const dayMatch = text.match(dayPattern);
    if (dayMatch) {
      title = dayMatch[1].trim();
      const dayName = dayMatch[2].toLowerCase();
      const hour = parseInt(dayMatch[3]);
      const minute = parseInt(dayMatch[4]);

      const targetDayNum = dayNames[dayName];
      const today = startOfToday();
      const currentDayNum = today.getDay();

      let daysToAdd = targetDayNum - currentDayNum;
      if (daysToAdd <= 0) daysToAdd += 7;

      const eventDate = addDays(today, daysToAdd);
      dateTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), hour, minute);
      hasDateTime = true;
    }
  }

  // Pattern 3: "Testo YYYY-MM-DD HH:MM"
  if (!hasDateTime) {
    const isoPattern = /(.+?)\s+(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/;
    const isoMatch = text.match(isoPattern);
    if (isoMatch) {
      title = isoMatch[1].trim();
      const year = parseInt(isoMatch[2]);
      const month = parseInt(isoMatch[3]) - 1;
      const day = parseInt(isoMatch[4]);
      const hour = parseInt(isoMatch[5]);
      const minute = parseInt(isoMatch[6]);
      dateTime = new Date(year, month, day, hour, minute);
      hasDateTime = isValid(dateTime);
    }
  }

  // Pattern 4: "Testo HH:MM" (assume today)
  if (!hasDateTime) {
    const timeOnlyPattern = /(.+?)\s+(\d{1,2}):(\d{2})(?:\s|$)/;
    const timeMatch = text.match(timeOnlyPattern);
    if (timeMatch) {
      const potentialTitle = timeMatch[1].trim();
      // Only match if it doesn't look like a sentence ending
      if (!potentialTitle.match(/[.!?]$/)) {
        title = potentialTitle;
        const hour = parseInt(timeMatch[2]);
        const minute = parseInt(timeMatch[3]);
        const today = startOfToday();
        dateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);
        hasDateTime = true;
      }
    }
  }

  return {
    title,
    description: originalText,
    dateTime,
    hasDateTime,
    originalText,
  };
}

/**
 * Formatta una data parsata per il display
 */
export function formatParsedDateTime(date: Date): string {
  return date.toLocaleString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Valida se la data parsata è nel futuro
 */
export function isDateInFuture(date: Date): boolean {
  return date > new Date();
}
