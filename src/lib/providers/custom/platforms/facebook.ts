import type { SocialAccount } from "../../../../generated/client";
import { fetchWithRetry } from "../../../token-utils";
import { uploadFacebookImage, uploadFacebookVideo } from "../media-upload";
import { getValidToken } from "../utils/tokens";
import type { PlatformPublisher, PublishResult } from "../../../publishers";
import type { PlatformProvider } from "../types";

type FacebookPage = {
  id: string;
  access_token: string;
};

type FacebookPagesResponse = {
  data?: FacebookPage[];
};

export class FacebookPublisher implements PlatformPublisher, PlatformProvider {
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

      const pagesRes = await fetchWithRetry(
        `https://graph.facebook.com/v17.0/me/accounts?access_token=${token}`,
        {}
      );
      const pagesData = (await pagesRes.json()) as FacebookPagesResponse;

      if (!pagesData.data || pagesData.data.length === 0) {
        return { success: false, error: "No Facebook pages found. Connect a page to publish." };
      }

      const page = account.accountId
        ? pagesData.data.find((p) => p.id === account.accountId) || pagesData.data[0]
        : pagesData.data[0];

      const pageAccessToken = page.access_token;
      const pageId = page.id;

      if (mediaUrls.length > 0) {
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

        if (mediaUrls.length === 1) {
          try {
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
              throw new Error(photoData.error?.message || "URL upload failed");
            }
            
            return {
              success: true,
              externalId: photoData.id,
              platformPostId: account.id,
            };
          } catch {
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
            retryable: data.error?.code === 4 || data.error?.code === 17,
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

  async refreshProfile(account: SocialAccount) {
    const token = await getValidToken(account);
    if (!token) return {};
    try {
      const res = await fetch(`https://graph.facebook.com/me?fields=name,fan_count&access_token=${token}`);
      const data = await res.json();
      return {
        accountName: data.name,
        followers: data.fan_count || 0,
      };
    } catch (e) {
      return {};
    }
  }

  async fetchEngagement(account: SocialAccount, platformPostId: string) {
    const token = await getValidToken(account);
    if (!token) return null;
    try {
      const res = await fetch(
        `https://graph.facebook.com/v17.0/${platformPostId}?fields=likes.summary(true).limit(0),comments.summary(true).limit(0),shares&access_token=${token}`
      );
      const data = await res.json();
      return {
        likes: data.likes?.summary?.total_count || 0,
        comments: data.comments?.summary?.total_count || 0,
        shares: data.shares?.count || 0,
      };
    } catch (e) {
      console.error("Facebook engagement fetch error:", e);
      return null;
    }
  }

  async fetchComments(account: SocialAccount, platformPostId: string) {
    const token = await getValidToken(account);
    if (!token) return null;
    try {
      const res = await fetch(
        `https://graph.facebook.com/v17.0/${platformPostId}/comments?fields=from,message,created_time&access_token=${token}`
      );
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.error("Facebook comments fetch error:", e);
      return null;
    }
  }
}
