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
            mediaAssets.push({
              media: asset,
              status: "READY",
              title: { text: "Image" },
            });
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
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: content,
              },
              shareMediaCategory: "IMAGE",
              media: mediaAssets,
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        };
      } else {
        postData = {
          author,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: content,
              },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        };
      }

      const res = await fetchWithRetry(
        "https://api.linkedin.com/rest/ugcPosts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Linkedin-Version": "202510",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify(postData),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.message || "LinkedIn API error",
          retryable: res.status === 429 || res.status === 503,
        };
      }

      return {
        success: true,
        externalId: data.id,
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
