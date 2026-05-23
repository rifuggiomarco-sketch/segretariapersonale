import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, googleTokens, InsertGoogleToken, emails, calendarEvents, userNotes, briefings, syncLogs, weeklyShifts, InsertWeeklyShift } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getGoogleToken(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertGoogleToken(userId: number, token: Omit<InsertGoogleToken, 'userId'>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(googleTokens).values({ ...token, userId }).onDuplicateKeyUpdate({
    set: { accessToken: token.accessToken, refreshToken: token.refreshToken, expiresAt: token.expiresAt, updatedAt: new Date() },
  });
}

export async function getRecentEmails(userId: number, days: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return await db.select().from(emails).where((e) => and(eq(e.userId, userId), gte(e.receivedAt, cutoffDate))).orderBy((e) => desc(e.receivedAt));
}

export async function getUpcomingCalendarEvents(userId: number, days: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return await db.select().from(calendarEvents).where((e) => and(eq(e.userId, userId), gte(e.startTime, now), lte(e.startTime, futureDate))).orderBy((e) => asc(e.startTime));
}

export async function getTodayNotes(userId: number, date: Date) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return await db.select().from(userNotes).where((n) => and(eq(n.userId, userId), gte(n.forDate, startOfDay), lte(n.forDate, endOfDay)));
}

export async function saveBriefing(userId: number, content: string, generatedFor: Date) {
  const db = await getDb();
  if (!db) return;
  await db.insert(briefings).values({ userId, content, generatedFor, generatedAt: new Date() });
}

/** Upsert briefing for a given day — deletes existing one then inserts fresh. */
export async function upsertBriefing(userId: number, content: string, generatedFor: Date) {
  const db = await getDb();
  if (!db) return;
  const startOfDay = new Date(generatedFor);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(generatedFor);
  endOfDay.setHours(23, 59, 59, 999);
  // Delete any existing briefing for this day first
  await db.delete(briefings).where(
    and(eq(briefings.userId, userId), gte(briefings.generatedFor, startOfDay), lte(briefings.generatedFor, endOfDay))
  );
  await db.insert(briefings).values({ userId, content, generatedFor, generatedAt: new Date() });
}

export async function getBriefing(userId: number, date: Date) {
  const db = await getDb();
  if (!db) return undefined;
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const result = await db.select().from(briefings).where((b) => and(eq(b.userId, userId), gte(b.generatedFor, startOfDay), lte(b.generatedFor, endOfDay))).orderBy((b) => desc(b.generatedAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBriefingHistory(userId: number, limit: number = 30) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(briefings).where(eq(briefings.userId, userId)).orderBy((b) => desc(b.generatedFor)).limit(limit);
}

export async function logSync(userId: number, syncType: 'gmail' | 'calendar', status: 'success' | 'error' | 'pending', message?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(syncLogs).values({ userId, syncType, status, message, lastSyncAt: new Date() });
}

export async function saveEmail(userId: number, email: Omit<typeof emails.$inferInsert, 'userId'>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(emails).values({ ...email, userId }).onDuplicateKeyUpdate({
    set: { subject: email.subject, snippet: email.snippet, body: email.body, syncedAt: new Date() },
  });
}

export async function saveCalendarEvent(userId: number, event: Omit<typeof calendarEvents.$inferInsert, 'userId'>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(calendarEvents).values({ ...event, userId }).onDuplicateKeyUpdate({
    set: { title: event.title, description: event.description, startTime: event.startTime, endTime: event.endTime, location: event.location, syncedAt: new Date() },
  });
}

export async function saveUserNote(userId: number, content: string, forDate: Date) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userNotes).values({ userId, content, forDate });
}


export async function getUserNotes(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(userNotes).where((n) => eq(n.userId, userId)).orderBy((n) => desc(n.createdAt)).limit(limit);
}


export async function saveWeeklyShifts(userId: number, shifts: InsertWeeklyShift[]) {
  const db = await getDb();
  if (!db) return;
  
  // Delete existing shifts for this week first
  if (shifts.length > 0) {
    const weekStart = shifts[0]!.weekStartDate;
    await db.delete(weeklyShifts).where(
      and(
        eq(weeklyShifts.userId, userId),
        eq(weeklyShifts.weekStartDate, weekStart)
      )
    );
  }
  
  // Insert new shifts
  if (shifts.length > 0) {
    await db.insert(weeklyShifts).values(shifts);
  }
}

export async function getWeeklyShifts(userId: number, weekStartDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(weeklyShifts).where(
    and(
      eq(weeklyShifts.userId, userId),
      eq(weeklyShifts.weekStartDate, weekStartDate)
    )
  );
}

export async function getUpcomingWeeks(userId: number, weeksAhead: number = 2) {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  
  const dates = [];
  for (let i = 0; i < weeksAhead; i++) {
    const weekStart = new Date(monday);
    weekStart.setDate(monday.getDate() + i * 7);
    dates.push(weekStart);
  }
  
  return await db.select().from(weeklyShifts).where(
    and(
      eq(weeklyShifts.userId, userId),
      gte(weeklyShifts.weekStartDate, dates[0]!),
      lte(weeklyShifts.weekStartDate, dates[dates.length - 1]!)
    )
  );
}
