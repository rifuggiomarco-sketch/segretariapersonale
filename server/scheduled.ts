import { Request, Response } from "express";
import { getDb, getGoogleToken, getRecentEmails, getUpcomingCalendarEvents, getTodayNotes, saveBriefing, upsertBriefing, logSync, saveEmail, saveCalendarEvent } from "./db";
import * as google from "./google";
import { generateBriefing } from "./briefing";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";

/**
 * Scheduled handler for daily briefing generation and sync
 * Path: /api/scheduled/daily-briefing
 * Cron: 0 0 7 * * * (7:00 UTC every day)
 */
export async function handleDailyBriefing(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const userId = user.id;
    const now = new Date();

    try {
      // Get stored Google token
      const googleToken = await getGoogleToken(userId);
      if (!googleToken) {
        await logSync(userId, "gmail", "error", "Google token not found");
        return res.json({ ok: true, skipped: "no-google-token" });
      }

      // Sync Gmail
      try {
        const emails = await google.fetchRecentEmails(googleToken.accessToken, 7);
        for (const email of emails) {
          await saveEmail(userId, email);
        }
        await logSync(userId, "gmail", "success", `Synced ${emails.length} emails`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await logSync(userId, "gmail", "error", message);
      }

      // Sync Calendar
      try {
        const events = await google.fetchUpcomingEvents(googleToken.accessToken, 7);
        for (const event of events) {
          await saveCalendarEvent(userId, event);
        }
        await logSync(userId, "calendar", "success", `Synced ${events.length} events`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await logSync(userId, "calendar", "error", message);
      }

      // Generate briefing
      try {
        const emails = await getRecentEmails(userId, 7);
        const calendarEvents = await getUpcomingCalendarEvents(userId, 7);
        const userNotes = await getTodayNotes(userId, now);

        const content = await generateBriefing({
          emails,
          calendarEvents,
          userNotes,
          userName: user.name || "User",
        });

        await upsertBriefing(userId, content, now);
        await logSync(userId, "gmail", "success", "Briefing generated successfully");

        // Send notification to owner
        const briefingPreview = content.substring(0, 200) + "...";
        await notifyOwner({
          title: `📋 Briefing Giornaliero - ${new Date().toLocaleDateString("it-IT")}`,
          content: briefingPreview,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await logSync(userId, "gmail", "error", `Briefing generation failed: ${message}`);
      }

      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const stack = error instanceof Error ? error.stack : "";

      return res.status(500).json({
        error: message,
        stack,
        context: {
          url: req.url,
          taskUid: user.taskUid,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : "";

    return res.status(500).json({
      error: message,
      stack,
      context: {
        url: req.url,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
