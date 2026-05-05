import Zernio from "@zernio/node";
import type { Platform } from "@/generated/client";

/**
 * Zernio platform identifiers (lowercase) accepted by the Zernio API.
 * This is a strict subset of the platforms we expose in the AmplifyHub UI.
 */
export type ZernioPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "tiktok"
  | "youtube"
  | "whatsapp";

const PRISMA_TO_ZERNIO: Partial<Record<Platform, ZernioPlatform>> = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  LINKEDIN: "linkedin",
  TWITTER: "twitter",
  TIKTOK: "tiktok",
  YOUTUBE: "youtube",
  WHATSAPP: "whatsapp",
};

const ZERNIO_TO_PRISMA: Record<ZernioPlatform, Platform> = {
  facebook: "FACEBOOK",
  instagram: "INSTAGRAM",
  linkedin: "LINKEDIN",
  twitter: "TWITTER",
  tiktok: "TIKTOK",
  youtube: "YOUTUBE",
  whatsapp: "WHATSAPP",
};

let _client: Zernio | null = null;

/**
 * Returns a memoised Zernio SDK client. The constructor reads
 * `process.env.ZERNIO_API_KEY` automatically.
 */
export function getZernioClient(): Zernio {
  if (!process.env.ZERNIO_API_KEY) {
    throw new Error("ZERNIO_API_KEY is not configured");
  }
  if (!_client) {
    _client = new Zernio();
  }
  return _client;
}

/**
 * Resolves the Zernio profileId required by `connect.getConnectUrl` and
 * `connect.handleOAuthCallback`. Configure via the `ZERNIO_PROFILE_ID`
 * environment variable (find yours at https://zernio.com/dashboard).
 */
export function getZernioProfileId(): string {
  const id = process.env.ZERNIO_PROFILE_ID;
  if (!id) {
    throw new Error("ZERNIO_PROFILE_ID is not configured");
  }
  return id;
}

/**
 * Public-facing base URL of this Next.js app. Falls back to NEXTAUTH_URL
 * for local/dev parity, then to localhost.
 */
export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

/**
 * Normalises an arbitrary platform string (e.g. "twitter", "TWITTER",
 * "Twitter") into the lowercase identifier expected by Zernio. Returns
 * null for platforms Zernio cannot handle.
 */
export function toZernioPlatform(value: string): ZernioPlatform | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower in ZERNIO_TO_PRISMA) {
    return lower as ZernioPlatform;
  }
  const upper = value.toUpperCase() as Platform;
  return PRISMA_TO_ZERNIO[upper] ?? null;
}

/**
 * Converts a Zernio platform identifier back to the Prisma `Platform`
 * enum used internally by AmplifyHub.
 */
export function fromZernioPlatform(value: string): Platform | null {
  if (!value) return null;
  const lower = value.toLowerCase() as ZernioPlatform;
  return ZERNIO_TO_PRISMA[lower] ?? null;
}
