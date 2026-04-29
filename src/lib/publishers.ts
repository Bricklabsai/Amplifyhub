import type { Platform, SocialAccount } from "../generated/client";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import { prisma } from "./prisma";
import { refreshAccessToken, fetchWithRetry } from "./token-utils";
import {
  cleanupTempFile,
  createFormData,
  downloadMedia,
  uploadFacebookImage,
  uploadFacebookVideo,
  uploadLinkedInImage,
  uploadTikTokVideo,
  uploadYouTubeVideo,
} from "./media-upload";

export interface PublishResult {
  success: boolean;
  externalId?: string;
  platformPostId?: string;
  error?: string;
  retryable?: boolean;
}

export interface PlatformPublisher {
  publish(
    account: SocialAccount,
    content: string,
    mediaUrls?: string[]
  ): Promise<PublishResult>;
  /**
   * Optional batch publish. When implemented, the dispatcher will fan out
   * a single underlying API call instead of making one parallel `publish`
   * call per account. Aggregator providers like Zernio expose a single
   * createPost endpoint that accepts multiple platforms, so batching is
   * required to avoid same-content dedup hitting all-but-one platform.
   */
  publishBatch?(
    accounts: SocialAccount[],
    content: string,
    mediaUrls?: string[]
  ): Promise<Map<string, PublishResult>>;
}

type FacebookPage = {
  id: string;
  access_token: string;
};

type FacebookPagesResponse = {
  data?: FacebookPage[];
};

type TweetData = {
  text: string;
  media?: {
    media_ids: string[];
  };
};

// Helper to get fresh token
async function getValidToken(account: SocialAccount): Promise<string | null> {
  let token = account.accessToken;
  
  // Check if token is expired
  if (account.expiresAt && new Date() >= account.expiresAt) {
    token = await refreshAccessToken(prisma, account.id);
  }
  
  return token || account.accessToken;
}

// Facebook Publisher using Graph API
export class FacebookPublisher implements PlatformPublisher {
  async publish(
    account: SocialAccount,
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResult> {
    if (!account.accessToken) {
      return { success: false, error: "Missing access token", retryable: false };
    }

    try {
      // Get fresh token if needed
      const token = await getValidToken(account);
      if (!token) {
        return { success: false, error: "Failed to get valid access token", retryable: true };
      }

      // Get the page to post to
      const pagesRes = await fetchWithRetry(
        `https://graph.facebook.com/v17.0/me/accounts?access_token=${token}`,
        {}
      );
      const pagesData = (await pagesRes.json()) as FacebookPagesResponse;

      if (!pagesData.data || pagesData.data.length === 0) {
        return { success: false, error: "No Facebook pages found. Connect a page to publish." };
      }

      // Use specified page or first available
      const page = account.accountId
        ? pagesData.data.find((p) => p.id === account.accountId) || pagesData.data[0]
        : pagesData.data[0];

      const pageAccessToken = page.access_token;
      const pageId = page.id;

      if (mediaUrls.length > 0) {
        // Detect if any URL is a video
        const isVideo = mediaUrls.some(url => 
          url.toLowerCase().endsWith(".mp4") || 
          url.toLowerCase().endsWith(".mov") || 
          url.toLowerCase().includes("video")
        );

        if (isVideo) {
          if (mediaUrls.length > 1) {
             return { success: false, error: "Multiple videos not supported on Facebook. Use one video per post.", retryable: false };
          }
          
          try {
            const videoId = await uploadFacebookVideo(pageAccessToken, pageId, mediaUrls[0]);
            // Videos on Facebook can take time to process, but we get the ID immediately
            return {
              success: true,
              externalId: videoId,
              platformPostId: account.id,
            };
          } catch (videoErr) {
            return {
              success: false,
              error: `Failed to upload video: ${videoErr instanceof Error ? videoErr.message : "Unknown error"}`,
              retryable: false,
            };
          }
        }

        // For single image: use /photos endpoint
        if (mediaUrls.length === 1) {
          try {
            // First try to use URL directly (Facebook can fetch)
            const photoRes = await fetchWithRetry(
              `https://graph.facebook.com/v17.0/${pageId}/photos`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: mediaUrls[0],
                  caption: content,
                  access_token: pageAccessToken,
                }),
              }
            );
            const photoData = await photoRes.json();
            
            if (!photoRes.ok) {
              // If URL fetch fails, try uploading bytes
              throw new Error(photoData.error?.message || "URL upload failed");
            }
            
            return {
              success: true,
              externalId: photoData.id,
              platformPostId: account.id,
            };
          } catch {
            // URL upload failed, try direct upload
            try {
              const mediaId = await uploadFacebookImage(pageAccessToken, pageId, mediaUrls[0]);
              const postRes = await fetchWithRetry(
                `https://graph.facebook.com/v17.0/${pageId}/feed`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: content,
                    attached_media: [{ media_fbid: mediaId }],
                    access_token: pageAccessToken,
                  }),
                }
              );
              const postData = await postRes.json();
              
              if (!postRes.ok) {
                throw new Error(postData.error?.message || "Post creation failed");
              }
              
              return {
                success: true,
                externalId: postData.id,
                platformPostId: account.id,
              };
            } catch (uploadErr) {
              return {
                success: false,
                error: `Failed to upload image: ${uploadErr instanceof Error ? uploadErr.message : "Unknown error"}`,
                retryable: false,
              };
            }
          }
        } else {
          // Multiple images - upload all as unpublished and then create feed post
          try {
            const mediaIds = [];
            for (const url of mediaUrls) {
              const mediaId = await uploadFacebookImage(pageAccessToken, pageId, url);
              mediaIds.push({ media_fbid: mediaId });
            }

            const postRes = await fetchWithRetry(
              `https://graph.facebook.com/v17.0/${pageId}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: content,
                  attached_media: mediaIds,
                  access_token: pageAccessToken,
                }),
              }
            );
            const postData = await postRes.json();

            if (!postRes.ok) {
              throw new Error(postData.error?.message || "Post creation failed");
            }

            return {
              success: true,
              externalId: postData.id,
              platformPostId: account.id,
            };
          } catch (multiUploadErr) {
            return {
              success: false,
              error: `Failed to upload multiple images: ${multiUploadErr instanceof Error ? multiUploadErr.message : "Unknown error"}`,
              retryable: false,
            };
          }
        }
      } else {
        // Text-only post
        const res = await fetchWithRetry(
          `https://graph.facebook.com/v17.0/${pageId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: content,
              access_token: pageAccessToken,
            }),
          }
        );
        
        const data = await res.json();
        
        if (!res.ok) {
          return {
            success: false,
            error: data.error?.message || "Facebook API error",
            retryable: data.error?.code === 4 || data.error?.code === 17, // Rate limit
          };
        }
        
        return {
          success: true,
          externalId: data.id,
          platformPostId: account.id,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        retryable: true,
      };
    }
  }
}

// Twitter/X Publisher using v2 API
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
      // Get fresh token if needed
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

      // Create the tweet
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
        // Download the media file
        const { path: filePath, type } = await downloadMedia(url);
        const fileStats = await fsPromises.stat(filePath);
        const fileSize = fileStats.size;
        
        // Check size - Twitter limit ~5MB for images, 512MB for videos
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB for images
        if (fileSize > MAX_SIZE && type.startsWith("image/")) {
          throw new Error("Image too large for Twitter (max 5MB)");
        }
        
        // Read file
        const fileBuffer = await fsPromises.readFile(filePath);
        const formData = createFormData();
        formData.append(
          "media",
          new Blob([fileBuffer]),
          `media${path.extname(filePath)}`
        );
        
        // Upload to Twitter v1.1 media endpoint (still required for media)
        // Simplified: in production, implement chunked upload for videos
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
        
        // Cleanup
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

// LinkedIn Publisher
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
      // Get fresh token if needed
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
        // Upload all images and collect their assets
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
              shareMediaCategory: mediaAssets.length > 1 ? "IMAGE" : "IMAGE", // Both use IMAGE category
              media: mediaAssets,
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        };
      } else {
        // Text-only post
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

// Instagram Publisher (Basic Display API or Graph API)
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
      // Get fresh token if needed
      const token = await getValidToken(account);
      if (!token) {
        return { success: false, error: "Failed to get valid access token", retryable: true };
      }

      // Instagram requires media container creation then publishing
      // Note: Basic Display API has limitations
      // Graph API requires Business/Creator account for posting

      if (mediaUrls.length === 0) {
        return {
          success: false,
          error: "Instagram requires at least one image or video",
        };
      }

      // Step 1: Create media container
      const containerRes = await fetchWithRetry(
        `https://graph.instagram.com/v17.0/me/media?access_token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: content,
            image_url: mediaUrls[0], // For single image
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

      // Step 2: Publish the container (may require status check)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing

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

// TikTok Publisher
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
      // Get fresh token if needed
      const token = await getValidToken(account);
      if (!token) {
        return { success: false, error: "Failed to get valid access token", retryable: true };
      }

      // TikTok requires video uploads
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

// YouTube Publisher
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
      // Get fresh token if needed
      const token = await getValidToken(account);
      if (!token) {
        return { success: false, error: "Failed to get valid access token", retryable: true };
      }

      // YouTube requires video upload
      if (mediaUrls.length === 0) {
        return {
          success: false,
          error: "YouTube requires a video upload. Text-only posts are not supported via the API.",
          retryable: false,
        };
      }

      // We use the first video URL
      const videoUrl = mediaUrls.find(url => 
        url.toLowerCase().endsWith(".mp4") || 
        url.toLowerCase().endsWith(".mov") || 
        url.toLowerCase().includes("video")
      );

      if (!videoUrl) {
         return { success: false, error: "No video found in media URLs for YouTube publish.", retryable: false };
      }

      // Use content as description, title from first line of content or default
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

// WhatsApp Business Publisher
export class WhatsAppPublisher implements PlatformPublisher {
  async publish(
    account: SocialAccount,
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResult> {
    try {
      // WhatsApp Business API works differently - it's for 1:1 or template messages
      // For "posting" content to WhatsApp, you'd need:
      // 1) Template messages (requires pre-approved templates) OR
      // 2) Customer service messages (24h window)
      // This is not a "publish to feed" like other platforms
      
      return {
        success: false,
        error: "WhatsApp does not support feed-based posting. Use the dedicated WhatsApp message sender to send messages to contacts/groups.",
        retryable: false,
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

// Main publisher factory
export function getPublisher(platform: Platform): PlatformPublisher {
  const publishers: Record<Platform, PlatformPublisher> = {
    FACEBOOK: new FacebookPublisher(),
    TWITTER: new TwitterPublisher(),
    INSTAGRAM: new InstagramPublisher(),
    LINKEDIN: new LinkedInPublisher(),
    TIKTOK: new TikTokPublisher(),
    YOUTUBE: new YouTubePublisher(),
    WHATSAPP: new WhatsAppPublisher(),
  };

  return publishers[platform];
}

// Publish a post to multiple platforms
export async function publishToPlatforms(
  accounts: SocialAccount[],
  content: string,
  mediaUrls: string[] = []
): Promise<Map<string, PublishResult>> {
  const results = new Map<string, PublishResult>();

  // Publish to each account in parallel, isolated errors
  await Promise.all(
    accounts.map(async (account) => {
      try {
        const publisher = getPublisher(account.platform);
        const result = await publisher.publish(account, content, mediaUrls);
        results.set(account.id, result);
      } catch (error) {
        results.set(account.id, {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error during publish",
        });
      }
    })
  );

  return results;
}
