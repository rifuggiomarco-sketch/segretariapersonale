import type { Express, Request, Response } from "express";
import * as db from "./db";
import * as googleApi from "./google";
import { ENV } from "./_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

export function registerGoogleOAuthCallback(app: Express) {
  app.get("/api/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    console.log("[Google OAuth Callback] Received:", { code: !!code, state: !!state });

    if (!code) {
      console.error("[Google OAuth Callback] Missing authorization code");
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    try {
      // Exchange authorization code for tokens
      const tokens = await googleApi.getTokenFromCode(code);
      
      if (!tokens.access_token) {
        console.error("[Google OAuth Callback] No access token received");
        res.status(400).json({ error: "Failed to obtain access token" });
        return;
      }

      console.log("[Google OAuth Callback] Got access token successfully");

      // Get the current user from the session (if exists)
      let userId = (req as any).user?.id;

      // If no user session, create one using Manus OAuth
      if (!userId) {
        console.log("[Google OAuth Callback] No existing session, creating new user");
        
        // For now, we'll need to use a temporary approach
        // In production, you might want to use Google's user info to create a Manus user
        // For this MVP, we'll redirect to login first
        res.redirect(302, "/?error=please_login_first");
        return;
      }

      // Save Google tokens to database
      await db.upsertGoogleToken(userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      });

      console.log("[Google OAuth Callback] Tokens saved for user:", userId);

      // Redirect back to dashboard
      res.redirect(302, "/?google=connected");
    } catch (error) {
      console.error("[Google OAuth Callback] Error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.redirect(302, `/?google=error&message=${encodeURIComponent(message)}`);
    }
  });
}
