import type { SocialAccount } from "../../../../generated/client";
import { uploadTikTokVideo } from "../media-upload";
import { getValidToken } from "../utils/tokens";
import type { PlatformPublisher, PublishResult } from "../../../publishers";

export class TikTokPublisher implements PlatformPublisher {
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
          error: "TikTok requires a video upload",
          retryable: false,
        };
      }

      const videoUrl = mediaUrls.find(url => 
        url.toLowerCase().endsWith(".mp4") || 
        url.toLowerCase().endsWith(".mov") || 
        url.toLowerCase().includes("video")
      );

      if (!videoUrl) {
         return { success: false, error: "No video found in media URLs for TikTok publish.", retryable: false };
      }

      const publishId = await uploadTikTokVideo(token, videoUrl, content);

      return {
        success: true,
        externalId: publishId,
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
