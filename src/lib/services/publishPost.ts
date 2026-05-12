import type { SocialAccount } from "../../generated/client";
import type { PublishResult } from "../publishers";
import { getProvider } from "../providers/providerFactory";

export interface PublishPostData {
  accounts: SocialAccount[];
  content: string;
  mediaUrls?: string[];
}

export async function publishPost(
  data: PublishPostData
): Promise<Map<string, PublishResult>> {
  const { accounts, content, mediaUrls = [] } = data;
  const provider = getProvider();

  // Aggregator providers (Zernio) accept many platforms in a single call.
  // We strongly prefer that path because firing N parallel single-account
  // calls trips Zernio's same-content dedup, leaving N-1 platforms silently
  // unpublished.
  if (typeof provider.publishBatch === "function") {
    try {
      return await provider.publishBatch(accounts, content, mediaUrls);
    } catch (error) {
      // Surface the same shape as the per-account path so the caller's
      // result-handling logic is identical regardless of which path ran.
      const errorResult: PublishResult = {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during batch publish",
        retryable: true,
      };
      const results = new Map<string, PublishResult>();
      for (const account of accounts) results.set(account.id, errorResult);
      return results;
    }
  }

  // Fallback: per-account parallel publishes (used by CustomPublisher and
  // any other provider that doesn't expose a batch API).
  const results = new Map<string, PublishResult>();
  await Promise.all(
    accounts.map(async (account) => {
      try {
        const result = await provider.publish(account, content, mediaUrls);
        results.set(account.id, result);
      } catch (error) {
        results.set(account.id, {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during publish",
        });
      }
    })
  );

  return results;
}
