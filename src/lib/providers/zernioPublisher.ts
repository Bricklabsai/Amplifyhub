import type { SocialAccount } from "../../generated/client";
import type { PublishResult, PlatformPublisher } from "../publishers";
import {
  getZernioClient,
  toZernioPlatform,
  type ZernioPlatform,
} from "../zernio";
import { resolveMediaForZernio, type ZernioMediaKind } from "../zernio-media";

/**
 * Map Zernio's `errorCategory` to a retryable boolean. We retry transient
 * platform/system failures and rate-limits, but never user-content issues
 * (those will fail again until the caller fixes the input).
 */
function isRetryableCategory(category: string | undefined): boolean {
  switch (category) {
    case "platform_error":
    case "system_error":
    case "user_abuse":
      return true;
    case "auth_expired":
    case "user_content":
    case "account_issue":
    case "platform_rejected":
    default:
      return false;
  }
}

type BatchTarget = {
  account: SocialAccount;
  zernioPlatform: ZernioPlatform;
  zernioAccountId: string;
};

type ZernioMediaItem = { type: ZernioMediaKind; url: string };

type ZernioPlatformResult = {
  platform?: string;
  accountId?: unknown;
  status?: string;
  platformPostId?: string;
  errorMessage?: string;
  errorCategory?: string;
};

/**
 * Pre-flight validation. Returns the list of accounts that can be sent in
 * a Zernio batch and a Map of pre-computed failure results for the rest.
 */
function partitionAccounts(
  accounts: SocialAccount[]
): { targets: BatchTarget[]; results: Map<string, PublishResult> } {
  const results = new Map<string, PublishResult>();
  const targets: BatchTarget[] = [];

  for (const account of accounts) {
    if (!account.zernioAccountId) {
      results.set(account.id, {
        success: false,
        error: "Missing Zernio account ID",
        retryable: false,
      });
      continue;
    }
    const zernioPlatform = toZernioPlatform(account.platform);
    if (!zernioPlatform) {
      results.set(account.id, {
        success: false,
        error: `Platform ${account.platform} is not supported by Zernio`,
        retryable: false,
      });
      continue;
    }
    targets.push({
      account,
      zernioPlatform,
      zernioAccountId: account.zernioAccountId,
    });
  }

  return { targets, results };
}

function fillResultsForAll(
  targets: BatchTarget[],
  results: Map<string, PublishResult>,
  result: PublishResult
) {
  for (const t of targets) {
    if (!results.has(t.account.id)) results.set(t.account.id, result);
  }
}

/** Platforms that require a video file (not just an image). */
const VIDEO_REQUIRED_PLATFORMS = new Set<ZernioPlatform>(["tiktok", "youtube"]);

/** Platforms that require at least one image or video (no caption-only posts). */
const ANY_MEDIA_REQUIRED_PLATFORMS = new Set<ZernioPlatform>(["instagram"]);

function hasVideoMedia(mediaUrls: string[]): boolean {
  return mediaUrls.some(
    (url) =>
      /\.(mp4|mov|webm|ogg|m4v)(\?|#|$)/i.test(url) ||
      url.toLowerCase().includes("video")
  );
}

function hasImageOrVideoMedia(mediaUrls: string[]): boolean {
  if (mediaUrls.length === 0) return false;
  if (hasVideoMedia(mediaUrls)) return true;
  return mediaUrls.some((url) =>
    /\.(jpe?g|png|gif|webp|heic|heif|bmp)(\?|#|$)/i.test(url)
  );
}

/**
 * Removes targets that fail local media rules and records per-account errors
 * so we don't waste a Zernio createPost call that will reject them anyway.
 */
function applyMediaRequirements(
  targets: BatchTarget[],
  mediaUrls: string[],
  results: Map<string, PublishResult>
): BatchTarget[] {
  return targets.filter((t) => {
    if (VIDEO_REQUIRED_PLATFORMS.has(t.zernioPlatform) && !hasVideoMedia(mediaUrls)) {
      results.set(t.account.id, {
        success: false,
        error: `${t.account.platform} requires a video — attach one before publishing`,
        retryable: false,
      });
      return false;
    }
    if (
      ANY_MEDIA_REQUIRED_PLATFORMS.has(t.zernioPlatform) &&
      !hasImageOrVideoMedia(mediaUrls)
    ) {
      results.set(t.account.id, {
        success: false,
        error: `${t.account.platform} requires at least one image or video`,
        retryable: false,
      });
      return false;
    }
    return true;
  });
}

export class ZernioPublisher implements PlatformPublisher {
  /**
   * Publish to many accounts in a single Zernio createPost call. This is
   * the preferred path because Zernio's API is purpose-built for fan-out:
   * one Zernio Post with N PlatformTargets, atomically scheduled.
   */
  async publishBatch(
    accounts: SocialAccount[],
    content: string,
    mediaUrls: string[] = []
  ): Promise<Map<string, PublishResult>> {
    let { targets, results } = partitionAccounts(accounts);
    targets = applyMediaRequirements(targets, mediaUrls, results);
    if (targets.length === 0) {
      console.warn(
        "[ZernioPublisher] Skipping createPost — no publishable accounts:",
        accounts.map((a) => ({
          id: a.id,
          platform: a.platform,
          zernioAccountId: a.zernioAccountId ?? null,
          preflightError: results.get(a.id)?.error,
        }))
      );
      return results;
    }

    let zernio;
    try {
      zernio = getZernioClient();
    } catch (err) {
      fillResultsForAll(targets, results, {
        success: false,
        error: err instanceof Error ? err.message : "Zernio client error",
        retryable: false,
      });
      return results;
    }

    // Resolve media once for the whole batch — Zernio fans them out to
    // every platform, so we only need to upload each file a single time.
    let mediaItems: ZernioMediaItem[];
    try {
      mediaItems = await Promise.all(
        mediaUrls.map((url) => resolveMediaForZernio(url))
      );
    } catch (err) {
      fillResultsForAll(targets, results, {
        success: false,
        error: err instanceof Error ? err.message : "Media upload failed",
        retryable: false,
      });
      return results;
    }

    try {
      console.log(
        `[ZernioPublisher] createPost → ${targets.length} platform(s):`,
        targets.map((t) => `${t.zernioPlatform}:${t.zernioAccountId}`)
      );
      const apiResult = await zernio.posts.createPost({
        body: {
          content,
          mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
          platforms: targets.map((t) => ({
            platform: t.zernioPlatform,
            accountId: t.zernioAccountId,
          })),
          publishNow: true,
        },
      });

      if (apiResult.error) {
        const errBody = apiResult.error as { error?: string; message?: string };
        const status = apiResult.response?.status ?? 500;
        const message =
          errBody?.error ||
          errBody?.message ||
          `Zernio API error (HTTP ${status})`;
        console.error(
          "[ZernioPublisher] createPost API error:",
          message,
          "status:",
          status,
          "body:",
          JSON.stringify(apiResult.error)
        );
        fillResultsForAll(targets, results, {
          success: false,
          error: message,
          retryable: status === 429 || status >= 500,
        });
        return results;
      }

      const post = apiResult.data?.post;
      const responseTargets = (post?.platforms ?? []) as ZernioPlatformResult[];

      // Build a map from Zernio accountId -> response target so we can
      // route results back to our local SocialAccount.id keys.
      const byAccountId = new Map<string, ZernioPlatformResult>();
      for (const rt of responseTargets) {
        const id =
          typeof rt.accountId === "string"
            ? rt.accountId
            : (rt.accountId as { _id?: string } | undefined)?._id;
        if (id) byAccountId.set(id, rt);
      }

      for (const t of targets) {
        const rt = byAccountId.get(t.zernioAccountId);
        if (!rt) {
          // Zernio accepted the request but didn't return a status for this
          // account — most likely a partial failure on their side.
          results.set(t.account.id, {
            success: false,
            error: "Zernio response missing this account",
            retryable: true,
          });
          continue;
        }
        if (rt.status === "failed") {
          console.error(
            "[ZernioPublisher] platform failed:",
            t.zernioPlatform,
            rt.errorMessage,
            "category:",
            rt.errorCategory
          );
          results.set(t.account.id, {
            success: false,
            error: rt.errorMessage || "Publish failed on Zernio",
            retryable: isRetryableCategory(rt.errorCategory),
          });
          continue;
        }
        results.set(t.account.id, {
          success: true,
          externalId: rt.platformPostId,
          platformPostId: post?._id,
        });
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status =
        typeof (error as { statusCode?: number })?.statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : undefined;
      fillResultsForAll(targets, results, {
        success: false,
        error: message,
        retryable: status === undefined || status === 429 || status >= 500,
      });
      return results;
    }
  }

  /**
   * Single-account publish. Implemented as a thin wrapper around the batch
   * path so we have one code path to maintain.
   */
  async publish(
    account: SocialAccount,
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResult> {
    const results = await this.publishBatch([account], content, mediaUrls);
    return (
      results.get(account.id) ?? {
        success: false,
        error: "No publish result returned",
        retryable: true,
      }
    );
  }
}
