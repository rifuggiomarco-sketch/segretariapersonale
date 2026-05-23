import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as google from "./google";
import * as db from "./db";

export const googleRouter = router({
  /**
   * Get the Google OAuth authorization URL
   */
  getAuthUrl: protectedProcedure.query(() => {
    return { authUrl: google.getAuthUrl() };
  }),

  /**
   * Handle OAuth callback and save the token
   */
  handleCallback: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const tokens = await google.getTokenFromCode(input.code);

        if (!tokens.access_token) {
          throw new Error("No access token received from Google");
        }

        // Save the token to database
        await db.upsertGoogleToken(ctx.user.id, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        });

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to handle Google OAuth callback: ${message}`);
      }
    }),

  /**
   * Check if user has connected Google account
   */
  isConnected: protectedProcedure.query(async ({ ctx }) => {
    const token = await db.getGoogleToken(ctx.user.id);
    return { connected: !!token };
  }),

  /**
   * Disconnect Google account
   */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    // In a real app, you'd delete the token from the database
    // For now, we'll just return success
    return { success: true };
  }),
});
