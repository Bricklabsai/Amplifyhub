import type { SocialAccount } from "../../../../generated/client";
import { uploadYouTubeVideo } from "../media-upload";
import { getValidToken } from "../utils/tokens";
import type { PlatformPublisher, PublishResult } from "../../../publishers";

export class YouTubePublisher implements PlatformPublisher {
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
          error: "YouTube requires a video upload. Text-only posts are not supported via the API.",
          retryable: false,
        };
      }

      const videoUrl = mediaUrls.find(url => 
        url.toLowerCase().endsWith(".mp4") || 
        url.toLowerCase().endsWith(".mov") || 
        url.toLowerCase().includes("video")
      );

      if (!videoUrl) {
         return { success: false, error: "No video found in media URLs for YouTube publish.", retryable: false };
      }

      const lines = content.split("\n");
      const title = lines[0].substring(0, 100) || "Video from AmplifyHub";
      const description = content;

      const videoId = await uploadYouTubeVideo(token, videoUrl, title, description);

      return {
        success: true,
        externalId: videoId,
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
