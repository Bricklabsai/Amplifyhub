import type { PrismaClient } from "../generated/client";

/**
 * Refresh an access token using the stored refresh token
 */
export async function refreshAccessToken(
  prisma: PrismaClient,
  accountId: string
): Promise<string | null> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
  });

  if (!account || !account.refreshToken) {
    return null;
  }

  try {
    let tokenUrl = "";
    let body: Record<string, string> = {};

    switch (account.platform) {
      case "FACEBOOK":
        tokenUrl = "https://graph.facebook.com/v17.0/oauth/access_token";
        body = {
          grant_type: "fb_exchange_token",
          client_id: process.env.FACEBOOK_CLIENT_ID ?? "",
          client_secret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
          fb_exchange_token: account.refreshToken,
        };
        break;

      case "TWITTER":
        // Twitter v2 uses OAuth 2.0 with PKCE, refresh via token endpoint
        tokenUrl = "https://api.twitter.com/2/oauth2/token";
        body = {
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
          client_id: process.env.TWITTER_CLIENT_ID ?? "",
        };
        break;

      case "LINKEDIN":
        tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
        body = {
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
          client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
        };
        break;

      case "INSTAGRAM":
        // Instagram uses Facebook's token system
        tokenUrl = "https://graph.facebook.com/v17.0/oauth/access_token";
        body = {
          grant_type: "fb_exchange_token",
          client_id: process.env.FACEBOOK_CLIENT_ID ?? "", // Instagram uses FB app credentials
          client_secret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
          fb_exchange_token: account.refreshToken,
        };
        break;

      case "YOUTUBE":
        tokenUrl = "https://oauth2.googleapis.com/token";
        body = {
          client_id: process.env.YOUTUBE_CLIENT_ID ?? "",
          client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
          refresh_token: account.refreshToken,
          grant_type: "refresh_token",
        };
        break;

      case "TIKTOK":
        tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";
        body = {
          client_key: process.env.TIKTOK_CLIENT_ID ?? "",
          client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
        };
        break;

      default:
        return null;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // Twitter needs special auth header
    if (account.platform === "TWITTER") {
      headers.Authorization = `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString("base64")}`;
    }

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers,
      body: new URLSearchParams(body),
    });

    const data = await res.json();

    if (res.ok && data.access_token) {
      // Update the account with new token
      const expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null;

      await prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || account.refreshToken,
          expiresAt,
        },
      });

      return data.access_token;
    }

    console.error(`Token refresh failed for ${account.platform}:`, data);
    return null;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

/**
 * Retry with exponential backoff for rate-limited requests
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      
      // If not rate limited, return response
      if (res.status !== 429 && res.status !== 503) {
        return res;
      }

      // Retry on rate limit
      if (attempt < maxRetries) {
        const retryAfter = res.headers.get("retry-after");
        const delay = retryAfter
          ? Number.parseInt(retryAfter, 10) * 1000
          : baseDelay * 2 ** attempt + Math.random() * 1000;
        
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        return res;
      }
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, baseDelay * 2 ** attempt)
        );
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Max retries exceeded");
}
