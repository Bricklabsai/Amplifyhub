import { promises as fsPromises } from "node:fs";
import path from "node:path";
import type { SocialAccount } from "../../../../generated/client";
import { fetchWithRetry } from "../../../token-utils";
import { downloadMedia, createFormData, cleanupTempFile } from "../media-upload";
import { getValidToken } from "../utils/tokens";
import type { PlatformPublisher, PublishResult } from "../../../publishers";

type TweetData = {
  text: string;
  media?: {
    media_ids: string[];
  };
};

export class TwitterPublisher implements PlatformPublisher {
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

      let mediaIds: string[] = [];
      if (mediaUrls.length > 0) {
        try {
          mediaIds = await this.uploadMedia(token, mediaUrls);
        } catch (uploadErr) {
          return {
            success: false,
            error: `Failed to upload media: ${uploadErr instanceof Error ? uploadErr.message : "Unknown error"}`,
            retryable: false,
          };
        }
      }

      const tweetData: TweetData = { text: content };
      if (mediaIds.length > 0) {
        tweetData.media = { media_ids: mediaIds };
      }

      const res = await fetchWithRetry(
        "https://api.twitter.com/2/tweets",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(tweetData),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.title || data.detail || "Twitter API error",
          retryable: res.status === 429 || res.status === 503,
        };
      }

      return {
        success: true,
        externalId: data.data?.id,
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

  private async uploadMedia(accessToken: string, mediaUrls: string[]): Promise<string[]> {
    const mediaIds: string[] = [];
    
    for (const url of mediaUrls) {
      try {
        const { path: filePath, type } = await downloadMedia(url);
        const fileStats = await fsPromises.stat(filePath);
        const fileSize = fileStats.size;
        
        const MAX_SIZE = 5 * 1024 * 1024;
        if (fileSize > MAX_SIZE && type.startsWith("image/")) {
          throw new Error("Image too large for Twitter (max 5MB)");
        }
        
        const fileBuffer = await fsPromises.readFile(filePath);
        const formData = createFormData();
        formData.append(
          "media",
          new Blob([fileBuffer]),
          `media${path.extname(filePath)}`
        );
        
        const mediaRes = await fetch(
          "https://upload.twitter.com/1.1/media/upload.json",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData.getFormData(),
          }
        );
        
        const mediaData = await mediaRes.json();
        
        await cleanupTempFile(filePath);
        
        if (mediaRes.ok && mediaData.media_id_string) {
          mediaIds.push(mediaData.media_id_string);
        } else {
          throw new Error(mediaData.error || "Twitter media upload failed");
        }
      } catch (error) {
        console.error("Media upload error:", error);
        throw error;
      }
    }
    
    return mediaIds;
  }
}
