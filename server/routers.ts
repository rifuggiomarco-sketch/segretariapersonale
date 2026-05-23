import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as google from "./google";
import { generateBriefing } from "./briefing";
import { googleRouter } from "./google-oauth";
import { generateMockBriefing } from "./mock-data";
import { parseNote, formatParsedDateTime, isDateInFuture } from "./note-parser";
import { eq, desc } from "drizzle-orm";
import { extractShiftsFromImage, convertShiftsToDatabase } from "./shift-extractor";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  briefing: router({
    generate: protectedProcedure
      .input(z.object({ date: z.date().optional() }).optional())
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const date = input?.date || new Date();

        try {
          // Get data from database
          const emails = await db.getRecentEmails(userId, 7);
          const calendarEvents = await db.getUpcomingCalendarEvents(userId, 7);
          const userNotes = await db.getTodayNotes(userId, date);

          // Generate briefing with AI
          const content = await generateBriefing({
            emails,
            calendarEvents,
            userNotes,
            userName: ctx.user.name || "User",
          });

          // Save briefing to database
          await db.saveBriefing(userId, content, date);
          await db.logSync(userId, "gmail", "success", "Briefing generated successfully");

          return { success: true, content };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          await db.logSync(userId, "gmail", "error", message);
          throw error;
        }
      }),

    getCurrent: protectedProcedure
      .input(z.object({ date: z.date().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const date = input?.date || new Date();
        const briefing = await db.getBriefing(ctx.user.id, date);
        return briefing || null;
      }),

    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(30) }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getBriefingHistory(ctx.user.id, input?.limit || 30);
      }),

    generateMock: protectedProcedure
      .mutation(async ({ ctx }) => {
        const userId = ctx.user.id;

        const mockContent = generateMockBriefing(ctx.user.name || "User");
        await db.saveBriefing(userId, mockContent, new Date());

        return { success: true, content: mockContent };
      }),
  }),

  sync: router({
    gmail: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;

      try {
        // Get stored Google token
        const googleToken = await db.getGoogleToken(userId);
        if (!googleToken) {
          throw new Error("Google token not found. Please connect your Google account.");
        }

        // Fetch emails from Gmail
        const emails = await google.fetchRecentEmails(googleToken.accessToken, 7);

        // Save emails to database
        for (const email of emails) {
          await db.saveEmail(userId, email);
        }

        await db.logSync(userId, "gmail", "success", `Synced ${emails.length} emails`);
        return { success: true, count: emails.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await db.logSync(userId, "gmail", "error", message);
        throw error;
      }
    }),

    calendar: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;

      try {
        // Get stored Google token
        const googleToken = await db.getGoogleToken(userId);
        if (!googleToken) {
          throw new Error("Google token not found. Please connect your Google account.");
        }

        // Fetch events from Google Calendar
        const events = await google.fetchUpcomingEvents(googleToken.accessToken, 7);

        // Save events to database
        for (const event of events) {
          await db.saveCalendarEvent(userId, event);
        }

        await db.logSync(userId, "calendar", "success", `Synced ${events.length} events`);
        return { success: true, count: events.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await db.logSync(userId, "calendar", "error", message);
        throw error;
      }
    }),
  }),

  notes: router({
    save: protectedProcedure
      .input(z.object({ content: z.string(), forDate: z.date().optional() }))
      .mutation(async ({ ctx, input }) => {
        const forDate = input.forDate || new Date();
        await db.saveUserNote(ctx.user.id, input.content, forDate);
        return { success: true };
      }),

    getToday: protectedProcedure
      .input(z.object({ date: z.date().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const date = input?.date || new Date();
        return await db.getTodayNotes(ctx.user.id, date);
      }),

    getAll: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserNotes(ctx.user.id, input?.limit || 50);
      }),

    parseAndPreview: protectedProcedure
      .input(z.object({ content: z.string() }))
      .query(async ({ input }) => {
        const parsed = parseNote(input.content);

        if (parsed.hasDateTime && parsed.dateTime) {
          return {
            title: parsed.title,
            description: parsed.description,
            dateTime: parsed.dateTime,
            formattedDateTime: formatParsedDateTime(parsed.dateTime),
            isValid: isDateInFuture(parsed.dateTime),
            canCreateEvent: true,
          };
        }

        return {
          title: parsed.title,
          description: parsed.description,
          dateTime: null,
          formattedDateTime: null,
          isValid: false,
          canCreateEvent: false,
        };
      }),

    saveWithCalendarEvent: protectedProcedure
      .input(z.object({ content: z.string(), createEvent: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const forDate = new Date();

        // Save note
        await db.saveUserNote(userId, input.content, forDate);

        // If createEvent is true and user has Google connected, create calendar event
        if (input.createEvent) {
          try {
            const parsed = parseNote(input.content);

            if (parsed.hasDateTime && parsed.dateTime) {
              const googleToken = await db.getGoogleToken(userId);
              if (googleToken) {
                // Create event in Google Calendar
                await google.createCalendarEvent(googleToken.accessToken, {
                  title: parsed.title,
                  description: parsed.description,
                  startTime: parsed.dateTime,
                  endTime: new Date(parsed.dateTime.getTime() + 60 * 60 * 1000), // 1 hour duration
                });

                return { success: true, eventCreated: true };
              }
            }
          } catch (error) {
            console.warn("Failed to create calendar event:", error);
            // Note was saved, just event creation failed
          }
        }
        
        return { success: true, eventCreated: false };
      }),
  }),

  
  shifts: router({
    getUpcoming: protectedProcedure
      .input(z.object({ weeksAhead: z.number().default(2) }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUpcomingWeeks(ctx.user.id, input?.weeksAhead || 2);
      }),
    getWeek: protectedProcedure
      .input(z.object({ weekStartDate: z.date() }))
      .query(async ({ ctx, input }) => {
        return await db.getWeeklyShifts(ctx.user.id, input.weekStartDate);
      }),
    upload: protectedProcedure
      .input(z.object({ imageUrl: z.string(), weekStartDate: z.date() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
          // Extract shifts from image using AI
          const extractedShifts = await extractShiftsFromImage(input.imageUrl);
          if (extractedShifts.length === 0) {
            throw new Error("No shifts could be extracted from the image.");
          }
          
          // Convert to database format and save
          const dbShifts = convertShiftsToDatabase(extractedShifts, userId, input.weekStartDate);
          await db.saveWeeklyShifts(userId, dbShifts);
          
          return { success: true, count: extractedShifts.length };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          throw new Error(`Failed to process schedule image: ${message}`);
        }
      }),
  }),
  google: googleRouter,
});

export type AppRouter = typeof appRouter;
