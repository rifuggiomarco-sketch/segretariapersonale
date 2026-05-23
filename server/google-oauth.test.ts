import { describe, it, expect } from "vitest";
import * as google from "./google";
import { ENV } from "./_core/env";

describe("Google OAuth Credentials", () => {
  it("should have valid Google OAuth credentials configured", () => {
    // Get the auth URL - this will fail if credentials are not configured
    const authUrl = google.getAuthUrl();
    
    // Verify URL structure
    expect(authUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(authUrl).toContain("client_id=");
    expect(authUrl).toContain("redirect_uri=");
    expect(authUrl).toContain("scope=");
    expect(authUrl).toContain("response_type=code");
    
    // Verify it contains the required scopes
    expect(authUrl).toContain("gmail.readonly");
    expect(authUrl).toContain("calendar.readonly");
  });

  it("should include the correct redirect URI in auth URL", () => {
    const authUrl = google.getAuthUrl();
    
    // The redirect URI should be properly encoded for /api/oauth/callback
    expect(authUrl).toContain("segretaria-bzjzghfm.manus.space%2Fapi%2Foauth%2Fcallback");
  });

  it("should include the correct client ID", () => {
    const authUrl = google.getAuthUrl();
    
    // Should contain the client ID we just set
    expect(authUrl).toContain("502830605070-fr2dvhgb326u8182sm95v7u40uef6e9b.apps.googleusercontent.com");
  });
});
