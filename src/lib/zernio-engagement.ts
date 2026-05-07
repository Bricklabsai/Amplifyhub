import type { SocialAccount } from "../generated/client";
import { getZernioClient, getZernioProfileId } from "./zernio";

export type EngagementCounts = {
  likes: number;
  comments: number;
  shares: number;
  views?: number;
  reach?: number;
  impressions?: number;
};

export type EngagementComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
  replies: { id: string; message: string; createdAt: string }[];
};

/**
 * Fetches engagement counts (likes, comments, shares, …) for a single post
 * via Zernio's analytics endpoint. `postId` may be either Zernio's internal
 * post `_id` or the native platform post id — the API auto-resolves both.
 */
export async function fetchZernioEngagement(
  postId: string,
  zernioAccountId?: string | null
): Promise<EngagementCounts | null> {
  if (!postId) return null;
  try {
    const zernio = getZernioClient();
    const result = await zernio.analytics.getAnalytics({
      query: {
        postId,
        ...(zernioAccountId ? { accountId: zernioAccountId } : {}),
      },
    });

    if (result.error) {
      console.error("Zernio.analytics.getAnalytics error:", result.error);
      return null;
    }

    type SinglePost = {
      analytics?: {
        likes?: number;
        comments?: number;
        shares?: number;
        views?: number;
        reach?: number;
        impressions?: number;
      };
      platformAnalytics?: Array<{
        analytics?: {
          likes?: number;
          comments?: number;
          shares?: number;
          views?: number;
          reach?: number;
          impressions?: number;
        };
      }>;
    };
    const data = (result.data ?? {}) as SinglePost;
    const a =
      data.analytics ??
      data.platformAnalytics?.[0]?.analytics ??
      undefined;
    if (!a) return null;
    return {
      likes: a.likes ?? 0,
      comments: a.comments ?? 0,
      shares: a.shares ?? 0,
      views: a.views,
      reach: a.reach,
      impressions: a.impressions,
    };
  } catch (err) {
    console.error("fetchZernioEngagement threw:", err);
    return null;
  }
}

/**
 * Fetches the latest comments thread for a post via Zernio's inbox API.
 * Returns up to `limit` top-level comments (default 50).
 */
export async function fetchZernioComments(
  postId: string,
  zernioAccountId: string,
  limit = 50
): Promise<EngagementComment[]> {
  if (!postId || !zernioAccountId) return [];
  try {
    const zernio = getZernioClient();
    const result = await zernio.comments.getInboxPostComments({
      path: { postId },
      query: { accountId: zernioAccountId, limit },
    });

    if (result.error) {
      console.error(
        "Zernio.comments.getInboxPostComments error:",
        result.error
      );
      return [];
    }

    const raw = (result.data?.comments ?? []) as Array<{
      id?: string;
      message?: string;
      createdTime?: string;
      from?: { name?: string; username?: string };
      replies?: Array<{
        id?: string;
        message?: string;
        createdTime?: string;
      }>;
    }>;

    return raw
      .filter((c) => c.id && c.message)
      .map((c) => ({
        id: c.id as string,
        author:
          c.from?.name?.trim() ||
          c.from?.username?.trim() ||
          "Unknown commenter",
        message: c.message as string,
        createdAt: c.createdTime || new Date().toISOString(),
        replies: (c.replies ?? [])
          .filter((r) => r.message)
          .map((r) => ({
            id: r.id || `${c.id}:${r.createdTime ?? Math.random()}`,
            message: r.message as string,
            createdAt: r.createdTime || new Date().toISOString(),
          })),
      }));
  } catch (err) {
    console.error("fetchZernioComments threw:", err);
    return [];
  }
}

/**
 * Posts a reply to a comment (or the post itself) via Zernio's inbox API.
 * Returns the Zernio-generated comment id on success.
 */
export async function replyViaZernio(
  postId: string,
  zernioAccountId: string,
  message: string,
  parentCommentId?: string
): Promise<string | null> {
  if (!postId || !zernioAccountId || !message.trim()) return null;
  try {
    const zernio = getZernioClient();
    const result = await zernio.comments.replyToInboxPost({
      path: { postId },
      body: {
        accountId: zernioAccountId,
        message: message.trim(),
        ...(parentCommentId ? { commentId: parentCommentId } : {}),
      },
    });

    if (result.error) {
      console.error("Zernio.comments.replyToInboxPost error:", result.error);
      return null;
    }
    return result.data?.data?.commentId ?? null;
  } catch (err) {
    console.error("replyViaZernio threw:", err);
    return null;
  }
}

/**
 * Returns the latest follower counts for the given Zernio-connected
 * accounts. Calls Zernio's getFollowerStats endpoint **once** with a
 * comma-separated accountIds list, regardless of how many accounts are
 * supplied — saves N round-trips when refreshing the social-accounts page.
 * @param accounts - Array of social accounts
 * @param userZernioProfileId - The user's personal Zernio profile ID (created during registration)
 */
export async function fetchZernioFollowerCounts(
  accounts: SocialAccount[],
  userZernioProfileId?: string
): Promise<Map<string, { followers: number; displayName?: string; username?: string }>> {
  const out = new Map<
    string,
    { followers: number; displayName?: string; username?: string }
  >();

  const zernioBacked = accounts.filter(
    (a): a is SocialAccount & { zernioAccountId: string } =>
      Boolean(a.zernioAccountId)
  );
  if (zernioBacked.length === 0) return out;

  try {
    const zernio = getZernioClient();
    // Use the user's profile ID if provided, otherwise fall back to workspace profile ID
    const profileId = userZernioProfileId || getZernioProfileId();
    console.log(`[Zernio] Fetching follower stats for ${zernioBacked.length} accounts using profileId: ${profileId.substring(0, 8)}...`);
    
    const result = await zernio.accounts.getFollowerStats({
      query: {
        profileId,
        accountIds: zernioBacked.map((a) => a.zernioAccountId).join(","),
      },
    });

    if (result.error) {
      console.error("Zernio.accounts.getFollowerStats error:", result.error);
      return out;
    }

    type ZernioFollowerAccount = {
      _id?: string;
      currentFollowers?: number;
      followersCount?: number;
      username?: string;
      displayName?: string;
    };
    const remoteAccounts = (result.data?.accounts ?? []) as ZernioFollowerAccount[];

    // Map Zernio accountId -> our local account.id so callers don't have to
    // worry about the Zernio↔local id mapping themselves.
    const idMap = new Map<string, string>();
    for (const a of zernioBacked) idMap.set(a.zernioAccountId, a.id);

    for (const r of remoteAccounts) {
      if (!r._id) continue;
      const localId = idMap.get(r._id);
      if (!localId) continue;
      out.set(localId, {
        followers: r.currentFollowers ?? r.followersCount ?? 0,
        displayName: r.displayName,
        username: r.username,
      });
    }
    return out;
  } catch (err) {
    console.error("fetchZernioFollowerCounts threw:", err);
    return out;
  }
}
