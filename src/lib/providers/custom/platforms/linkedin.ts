import type { SocialAccount } from "../../../../generated/client";
import { fetchWithRetry } from "../../../token-utils";
import { uploadLinkedInImage } from "../media-upload";
import { getValidToken } from "../utils/tokens";
import type { PlatformPublisher, PublishResult } from "../../../publishers";

export class LinkedInPublisher implements PlatformPublisher {
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

      if (!account.accountId) {
        return { success: false, error: "LinkedIn account ID missing. Reconnect your LinkedIn account." };
      }

      const author = `urn:li:person:${account.accountId}`;
      let postData: Record<string, unknown>;

      if (mediaUrls.length > 0) {
        const mediaAssets = [];
        for (const mediaUrl of mediaUrls) {
          try {
            const asset = await uploadLinkedInImage(token, mediaUrl, author);
            mediaAssets.push(asset);
          } catch (err) {
            return {
              success: false,
              error: `Failed to upload image to LinkedIn: ${err instanceof Error ? err.message : "Unknown error"}`,
              retryable: false,
            };
          }
        }

        postData = {
          author,
          commentary: content,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
        };

        if (mediaAssets.length === 1) {
          (postData as any).content = {
            media: {
              id: mediaAssets[0],
            },
          };
        } else {
          (postData as any).content = {
            multiImage: {
              images: mediaAssets.map((id) => ({ id })),
            },
          };
        }
      } else {
        postData = {
          author,
          commentary: content,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
        };
      }

      const res = await fetchWithRetry(
        "https://api.linkedin.com/rest/posts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "LinkedIn-Version": "202510",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify(postData),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = "LinkedIn API error";
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (e) {
          errorMsg = `${res.status} ${res.statusText}: ${errorText.substring(0, 100)}`;
        }
        
        return {
          success: false,
          error: errorMsg,
          retryable: res.status === 429 || res.status === 503,
        };
      }

      const externalId = res.headers.get("x-restli-id") || "";
      
      return {
        success: true,
        externalId: externalId,
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
