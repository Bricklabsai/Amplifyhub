import type { SocialAccount } from "../../../../generated/client";
import { fetchWithRetry } from "../../../token-utils";
import { getValidToken } from "../utils/tokens";
import type { PlatformPublisher, PublishResult } from "../../../publishers";

export class InstagramPublisher implements PlatformPublisher {
  async publish(
    account: SocialAccount,
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResult> {
    if (!account.accessToken) {
      return { success: false, error: "Missing access token", retryable: false };
    }

    try {
      const token = await getValidToken(account);
      if (!token) {
        return { success: false, error: "Failed to get valid access token", retryable: true };
      }

      if (mediaUrls.length === 0) {
        return {
          success: false,
          error: "Instagram requires at least one image or video",
        };
      }

      const containerRes = await fetchWithRetry(
        `https://graph.instagram.com/v17.0/me/media?access_token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: content,
            image_url: mediaUrls[0],
          }),
        }
      );

      const containerData = await containerRes.json();

      if (!containerRes.ok) {
        return {
          success: false,
          error: containerData.error?.message || "Instagram media creation failed",
          retryable: containerRes.status === 429 || containerRes.status === 503,
        };
      }

      const containerId = containerData.id;

      await new Promise(resolve => setTimeout(resolve, 2000));

      const publishRes = await fetchWithRetry(
        `https://graph.instagram.com/v17.0/me/media_publish?access_token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
          }),
        }
      );

      const publishData = await publishRes.json();

      if (!publishRes.ok) {
        return {
          success: false,
          error: publishData.error?.message || "Instagram publish failed",
          retryable: publishRes.status === 429 || publishRes.status === 503,
        };
      }

      return {
        success: true,
        externalId: publishData.id,
        platformPostId: account.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        retryable: true,
      };
    }
  }
}
