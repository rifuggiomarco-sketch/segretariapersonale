import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as google from "./google";

const TEST_CLIENT_ID = "502830605070-fr2dvhgb326u8182sm95v7u40uef6e9b.apps.googleusercontent.com";
const TEST_REDIRECT_URI = "https://segretaria-bzjzghfm.manus.space/api/oauth/callback";

describe("Google OAuth Credentials", () => {
  const originalClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const originalRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  beforeAll(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = TEST_CLIENT_ID;
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = TEST_REDIRECT_URI;
  });

  afterAll(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = originalClientId;
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = originalClientSecret;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = originalRedirectUri;
  });

  it("should have valid Google OAuth credentials configured", () => {
    const authUrl = google.getAuthUrl();

    expect(authUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(authUrl).toContain("client_id=");
    expect(authUrl).toContain("redirect_uri=");
    expect(authUrl).toContain("scope=");
    expect(authUrl).toContain("response_type=code");
    expect(authUrl).toContain("gmail.readonly");
    expect(authUrl).toContain("calendar.readonly");
  });

  it("should include the correct redirect URI in auth URL", () => {
    const authUrl = google.getAuthUrl();
    expect(authUrl).toContain("segretaria-bzjzghfm.manus.space%2Fapi%2Foauth%2Fcallback");
  });

  it("should include the correct client ID", () => {
    const authUrl = google.getAuthUrl();
    expect(authUrl).toContain(TEST_CLIENT_ID);
  });
});
