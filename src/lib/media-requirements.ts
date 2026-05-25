import type { Platform } from "../generated/client";

export const MEDIA_REQUIREMENT_MESSAGES = {
  YOUTUBE_NO_MEDIA:
    "YouTube requires a video. Please attach a video before publishing.",
  YOUTUBE_NEEDS_VIDEO:
    "YouTube requires a video. Photos are not supported — attach a video file.",
  INSTAGRAM_NO_MEDIA:
    "Instagram requires media. Please attach a photo or video before publishing.",
  TIKTOK_NO_MEDIA:
    "TikTok requires media. Please attach a photo or video before publishing.",
} as const;

const VIDEO_PLATFORMS: Platform[] = ["YOUTUBE"];
const PHOTO_OR_VIDEO_PLATFORMS: Platform[] = ["INSTAGRAM", "TIKTOK"];

export function hasVideoMedia(mediaUrls: string[]): boolean {
  return mediaUrls.some(
    (url) =>
      /\.(mp4|mov|webm|ogg|m4v|avi)(\?|#|$)/i.test(url) ||
      url.toLowerCase().includes("/video") ||
      url.toLowerCase().includes("video/")
  );
}

export function hasImageMedia(mediaUrls: string[]): boolean {
  return mediaUrls.some((url) =>
    /\.(jpe?g|png|gif|webp|heic|heif|bmp)(\?|#|$)/i.test(url)
  );
}

export function hasImageOrVideoMedia(mediaUrls: string[]): boolean {
  if (mediaUrls.length === 0) return false;
  return hasVideoMedia(mediaUrls) || hasImageMedia(mediaUrls);
}

/** Returns a user-facing error for this platform, or null if media is valid. */
export function getMediaValidationError(
  platform: Platform,
  mediaUrls: string[]
): string | null {
  if (VIDEO_PLATFORMS.includes(platform)) {
    if (mediaUrls.length === 0) {
      return MEDIA_REQUIREMENT_MESSAGES.YOUTUBE_NO_MEDIA;
    }
    if (!hasVideoMedia(mediaUrls)) {
      return MEDIA_REQUIREMENT_MESSAGES.YOUTUBE_NEEDS_VIDEO;
    }
    return null;
  }

  if (PHOTO_OR_VIDEO_PLATFORMS.includes(platform)) {
    if (!hasImageOrVideoMedia(mediaUrls)) {
      return platform === "INSTAGRAM"
        ? MEDIA_REQUIREMENT_MESSAGES.INSTAGRAM_NO_MEDIA
        : MEDIA_REQUIREMENT_MESSAGES.TIKTOK_NO_MEDIA;
    }
    return null;
  }

  return null;
}

export function validateAccountsMedia(
  accounts: { platform: Platform }[],
  mediaUrls: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seen = new Set<Platform>();

  for (const account of accounts) {
    if (seen.has(account.platform)) continue;
    seen.add(account.platform);
    const err = getMediaValidationError(account.platform, mediaUrls);
    if (err && !errors.includes(err)) errors.push(err);
  }

  return { valid: errors.length === 0, errors };
}
