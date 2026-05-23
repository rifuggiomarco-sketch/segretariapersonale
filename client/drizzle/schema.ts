/**
 * drizzle/schema.ts
 *
 * Schema aggiornato — aggiunge la tabella google_tokens per
 * persistere i token OAuth Google per utente.
 *
 * FIX #2: senza questa tabella i token non venivano mai salvati,
 * quindi la sincronizzazione falliva dopo il primo utilizzo.
 *
 * Dopo aver sostituito questo file, esegui:
 *   pnpm db:push
 */

import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Tabella utenti esistente (invariata) ────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── NUOVA: Tabella token Google OAuth ───────────────────────────────────────
// Un record per utente. onDuplicateKeyUpdate aggiorna i token se l'utente
// si riautentica (invece di creare un duplicato).
export const googleTokens = mysqlTable("google_tokens", {
  id: int("id").autoincrement().primaryKey(),

  // FK verso users.id
  userId: int("userId").notNull().unique(), // .unique() = un token set per utente

  // access_token: scade dopo ~1 ora, viene rinnovato automaticamente tramite refresh_token
  accessToken: text("accessToken").notNull(),

  // refresh_token: non scade mai (finché l'utente non revoca l'accesso)
  // Può essere null se l'utente aveva già autorizzato in passato senza prompt=consent
  refreshToken: text("refreshToken"),

  // expiry_date: timestamp UNIX in ms (string per evitare overflow int32)
  expiryDate: varchar("expiryDate", { length: 20 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GoogleToken = typeof googleTokens.$inferSelect;
export type InsertGoogleToken = typeof googleTokens.$inferInsert;

// ─── Aggiungi qui le altre tabelle del progetto ───────────────────────────────
// (briefings, emails, calendar_events, user_notes, sync_logs — già create
//  nelle sessioni precedenti, non modificate da questo fix)
