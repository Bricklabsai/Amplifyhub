import { prisma } from "./prisma";
import {
  fetchZernioComments,
  fetchZernioEngagement,
  fetchZernioFollowerCounts,
} from "./zernio-engagement";

export async function refreshSocialProfile(socialAccountId: string) {

  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    include: { user: true },
  });

  if (!account) return null;

  // Preferred path: account is connected via Zernio. Pulls live follower
  // counts (and display name) from Zernio's analytics in a single call.
  if (account.zernioAccountId) {
    try {
      const stats = await fetchZernioFollowerCounts([account], account.user.zernioProfileId || undefined);
      const remote = stats.get(account.id);
      if (remote) {
        return await prisma.socialAccount.update({
          where: { id: socialAccountId },
          data: {
            accountName:
              remote.displayName || remote.username || account.accountName,
            followers: remote.followers,
            updatedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(
        `Zernio refresh failed for ${account.platform}, falling back:`,
        error
      );
    }
  }

  // Legacy fallback: account was connected via direct OAuth and still has a
  // platform access token.
  if (!account.accessToken) return account;

  try {
    let profileData: { accountName?: string; followers?: number; profileImage?: string } = {};

    switch (account.platform) {
      case "FACEBOOK":
        profileData = await fetchFacebookProfile(account.accessToken);
        break;
      case "TWITTER":
        profileData = await fetchTwitterProfile(account.accessToken);
        break;
      case "LINKEDIN":
        profileData = await fetchLinkedInProfile(account.accessToken);
        break;
      case "YOUTUBE":
        profileData = await fetchYouTubeProfile(account.accessToken);
        break;
      case "INSTAGRAM":
        profileData = await fetchInstagramProfile(account.accessToken);
        break;
      case "TIKTOK":
        profileData = await fetchTikTokProfile(account.accessToken);
        break;
      case "WHATSAPP":
        profileData = await fetchWhatsAppProfile();
        break;
      // Add other platforms as needed
    }

    if (Object.keys(profileData).length > 0) {
      return await prisma.socialAccount.update({
        where: { id: socialAccountId },
        data: {
          accountName: profileData.accountName || account.accountName,
          followers: profileData.followers ?? account.followers,
          profileImage: profileData.profileImage || account.profileImage,
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error(`Failed to refresh profile for ${account.platform}:`, error);
  }

  return account;
}

async function fetchFacebookProfile(accessToken: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/me?fields=name,fan_count&access_token=${accessToken}`);
    const data = await res.json();
    return {
      accountName: data.name,
      followers: data.fan_count || 0,
    };
  } catch (e) {
    return {};
  }
}

async function fetchTwitterProfile(accessToken: string) {
  try {
    const res = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return {
      accountName: data.data?.name || data.data?.username,
      followers: data.data?.public_metrics?.followers_count || 0,
    };
  } catch (e) {
    return {};
  }
}

async function fetchLinkedInProfile(accessToken: string) {
  try {
    // Try REST API first (works better with OIDC tokens)
    const res = await fetch("https://api.linkedin.com/rest/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202510",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (!res.ok) {
      console.warn(`LinkedIn REST API returned ${res.status}, falling back to v2 API`);
      return await fallbackFetchLinkedInProfileV2(accessToken);
    }

    const data = await res.json();
    
    // In Versioned API, firstName and lastName are direct strings
    const firstName = data.firstName || "";
    const lastName = data.lastName || "";
    const accountName = `${firstName} ${lastName}`.trim();
    
    let followers = 0;
    let profileImage: string | undefined;

    // Extract profile picture if available (Versioned API)
    if (data.profilePicture) {
      profileImage = data.profilePicture;
    }

    try {
      const id = data.id;
      if (id) {
        // Use versioned API for network size
        const networkRes = await fetch(
          `https://api.linkedin.com/rest/networkSizes/me?edgeType=FollowedBy`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "LinkedIn-Version": "202510",
              "X-Restli-Protocol-Version": "2.0.0",
            },
          }
        );
        if (networkRes.ok) {
          const networkData = await networkRes.json();
          followers = networkData.firstDegreeSize || networkData.followedByCount || 0;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch LinkedIn followers:", e);
    }

    return {
      accountName: accountName || "LinkedIn User",
      followers,
      profileImage,
    };
  } catch (e) {
    console.error("LinkedIn profile fetch error (REST API):", e);
    return await fallbackFetchLinkedInProfileV2(accessToken);
  }
}

async function fallbackFetchLinkedInProfileV2(accessToken: string) {
  try {
    const res = await fetch("https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!res.ok) return {};
    
    const data = await res.json();
    const accountName = `${data.localizedFirstName || ""} ${data.localizedLastName || ""}`.trim();
    let followers = 0;
    let profileImage: string | undefined;

    // Extract profile picture from V2 complex structure
    try {
      const displayImage = data.profilePicture?.["displayImage~"]?.elements?.[0]?.identifiers?.[0]?.identifier;
      if (displayImage) profileImage = displayImage;
    } catch (e) {
      // Ignore image parsing errors
    }

    try {
      const id = data.id;
      if (id) {
        const networkRes = await fetch(
          `https://api.linkedin.com/v2/networkSizes/urn:li:person:${id}?edgeType=FollowedBy`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (networkRes.ok) {
          const networkData = await networkRes.json();
          followers = networkData.firstDegreeSize || networkData.total || 0;
        }
      }
    } catch (e) {
      // Ignore follower fetching errors
    }

    return {
      accountName: accountName || "LinkedIn User",
      followers,
      profileImage,
    };
  } catch (e) {
    console.error("LinkedIn profile fetch error (v2 API fallback):", e);
    return {};
  }
}

async function fetchYouTubeProfile(accessToken: string) {
  try {
    const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    const channel = data.items?.[0];
    return {
      accountName: channel?.snippet?.title,
      followers: Number.parseInt(channel?.statistics?.subscriberCount || "0"),
    };
  } catch (e) {
    return {};
  }
}

async function fetchInstagramProfile(accessToken: string) {
  try {
    const res = await fetch(`https://graph.instagram.com/me?fields=username,account_type&access_token=${accessToken}`);
    const data = await res.json();
    return {
      accountName: data.username,
      followers: 0, // Requires additional permissions/endpoints for business accounts
    };
  } catch (e) {
    return {};
  }
}

async function fetchTikTokProfile(accessToken: string) {
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return {
      accountName: data.data?.user?.display_name,
      followers: data.data?.user?.follower_count || 0,
    };
  } catch (e) {
    return {};
  }
}

async function fetchWhatsAppProfile() {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const businessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    if (!accessToken || !businessId) return {};

    const res = await fetch(`https://graph.facebook.com/v17.0/${businessId}?access_token=${accessToken}`);
    const data = await res.json();
    return {
      accountName: data.name || "WhatsApp Business",
      followers: 0,
    };
  } catch (e) {
    return {};
  }
}

// Fetch engagement data for a platform post
export async function fetchPlatformPostEngagement(socialAccountId: string, platformPostId: string | null | undefined) {
  if (!platformPostId) return null;

  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
  });
  if (!account) return null;

  // Preferred: Zernio analytics. Works regardless of which platform the
  // account is on.
  if (account.zernioAccountId) {
    const counts = await fetchZernioEngagement(
      platformPostId,
      account.zernioAccountId
    );
    if (counts) return counts;
  }

  if (!account.accessToken) return null;

  try {
    switch (account.platform) {
      case "FACEBOOK":
        return await fetchFacebookPostEngagement(account.accessToken, platformPostId);
      case "TWITTER":
        return await fetchTwitterPostEngagement(account.accessToken, platformPostId);
      case "LINKEDIN":
        return await fetchLinkedInPostEngagement(account.accessToken, platformPostId);
      case "INSTAGRAM":
        return await fetchInstagramPostEngagement(account.accessToken, platformPostId);
      case "YOUTUBE":
        return await fetchYouTubePostEngagement(account.accessToken, platformPostId);
      case "TIKTOK":
        return await fetchTikTokPostEngagement(account.accessToken, platformPostId);
      default:
        return null;
    }
  } catch (error) {
    console.error(`Failed to fetch engagement for ${account.platform}:`, error);
    return null;
  }
}

// Fetch all post engagements for a user
export async function fetchAllPostEngagements(userId: string) {
  const platformPosts = await prisma.platformPost.findMany({
    where: {
      post: {
        userId,
        status: "PUBLISHED",
      },
    },
    include: {
      socialAccount: true,
    },
  });

  const results = [];
  for (const pp of platformPosts) {
    if (!pp.externalId) continue;
    const engagement = await fetchPlatformPostEngagement(pp.socialAccountId, pp.externalId);
    if (engagement) {
      // Persist the latest counts
      await prisma.platformPost.update({
        where: { id: pp.id },
        data: {
          likes: engagement.likes ?? pp.likes,
          comments: engagement.comments ?? pp.comments,
          shares: engagement.shares ?? pp.shares,
          reach: (engagement as any).reach ?? pp.reach,
        },
      });

      results.push({
        platformPostId: pp.id,
        platform: pp.platform,
        socialAccountId: pp.socialAccountId,
        ...engagement,
      });
    }
  }
  return results;
}

async function fetchFacebookPostEngagement(accessToken: string, postId: string | null | undefined) {
  if (!postId) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v17.0/${postId}?fields=likes.summary(true).limit(0),comments.summary(true).limit(0),shares&access_token=${accessToken}`
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

async function fetchTwitterPostEngagement(accessToken: string, tweetId: string | null | undefined) {
  if (!tweetId) return null;
  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await res.json();
    const metrics = data.data?.public_metrics || {};
    return {
      likes: metrics.like_count || 0,
      comments: metrics.reply_count || 0,
      shares: metrics.retweet_count || 0,
    };
  } catch (e) {
    console.error("Twitter engagement fetch error:", e);
    return null;
  }
}

async function fetchLinkedInPostEngagement(accessToken: string, shareUrn: string | null | undefined) {
  if (!shareUrn) return null;
  try {
    // Fetch reactions
    const reactionRes = await fetch(
      `https://api.linkedin.com/rest/socialActions/${shareUrn}?q=socialAction`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Linkedin-Version": "202510",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );
    const reactionData = await reactionRes.json();

    // Fetch comments count
    const commentRes = await fetch(
      `https://api.linkedin.com/rest/socialActions/${shareUrn}/comments?q=comments&start=0&count=0`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Linkedin-Version": "202510",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );
    const commentData = await commentRes.json();

    return {
      likes: reactionData.totalReactions || reactionData.elements?.[0]?.reactionCounts?.length || 0,
      comments: commentData.paging?.total || commentData.elements?.length || 0,
      shares: 0,
    };
  } catch (e) {
    console.error("LinkedIn engagement fetch error:", e);
    return null;
  }
}

async function fetchInstagramPostEngagement(accessToken: string, mediaId: string | null | undefined) {
  if (!mediaId) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v17.0/${mediaId}?fields=like_count,comments_count,comments.limit(0).summary(true)&access_token=${accessToken}`
    );
    const data = await res.json();
    return {
      likes: data.like_count || 0,
      comments: data.comments_count || 0,
      shares: 0,
    };
  } catch (e) {
    console.error("Instagram engagement fetch error:", e);
    return null;
  }
}

async function fetchYouTubePostEngagement(accessToken: string, videoId: string | null | undefined) {
  if (!videoId) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=statistics&key=${process.env.YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    const stats = data.items?.[0]?.statistics || {};
    return {
      likes: Number.parseInt(stats.likeCount || "0"),
      comments: Number.parseInt(stats.commentCount || "0"),
      shares: Number.parseInt(stats.shareCount || "0"),
    };
  } catch (e) {
    console.error("YouTube engagement fetch error:", e);
    return null;
  }
}

async function fetchTikTokPostEngagement(accessToken: string, videoId: string | null | undefined) {
  if (!videoId) return null;
  try {
    const res = await fetch(
      `https://open.tiktokapis.com/v2/research/video/query/?fields=stats`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_info: {
            source_type: "video_id",
            video_id: videoId,
          },
        }),
      }
    );
    const data = await res.json();
    return {
      likes: data.data?.video?.stats?.like_count || 0,
      comments: data.data?.video?.stats?.comment_count || 0,
      shares: data.data?.video?.stats?.share_count || 0,
    };
  } catch (e) {
    console.error("TikTok engagement fetch error:", e);
    return null;
  }
}

// Fetch comments for a platform post
export async function fetchPlatformPostComments(socialAccountId: string, platformPostId: string | null | undefined) {
  if (!platformPostId) return null;

  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
  });
  if (!account) return null;

  // Preferred: Zernio inbox comments. Works for every platform Zernio
  // supports without us touching individual graph APIs.
  if (account.zernioAccountId) {
    const comments = await fetchZernioComments(
      platformPostId,
      account.zernioAccountId
    );
    if (comments.length > 0) return comments;
  }

  if (!account.accessToken) return null;

  try {
    switch (account.platform) {
      case "FACEBOOK":
        return await fetchFacebookPostComments(account.accessToken, platformPostId);
      case "TWITTER":
        return await fetchTwitterPostComments(account.accessToken, platformPostId);
      case "LINKEDIN":
        return await fetchLinkedInPostComments(account.accessToken, platformPostId);
      case "INSTAGRAM":
        return await fetchInstagramPostComments(account.accessToken, platformPostId);
      case "YOUTUBE":
        return await fetchYouTubePostComments(account.accessToken, platformPostId);
      case "TIKTOK":
        return await fetchTikTokPostComments(account.accessToken, platformPostId);
      default:
        return null;
    }
  } catch (error) {
    console.error(`Failed to fetch comments for ${account.platform}:`, error);
    return null;
  }
}

async function fetchFacebookPostComments(accessToken: string, postId: string | null | undefined) {
  if (!postId) return [];
  try {
    const res = await fetch(
      `https://graph.facebook.com/v17.0/${postId}/comments?fields=from,message,created_time&limit=50&access_token=${accessToken}`
    );
    const data = await res.json();
    return (data.data || []).map((c: any) => ({
      id: c.id,
      author: c.from?.name || "Unknown",
      message: c.message,
      createdAt: c.created_time,
      replies: [],
    }));
  } catch (e) {
    console.error("Facebook comments fetch error:", e);
    return [];
  }
}

async function fetchTwitterPostComments(accessToken: string, tweetId: string | null | undefined) {
  if (!tweetId) return [];
  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}/replies?max_results=50&tweet.fields=author_id`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await res.json();
    const users = new Map((data.includes?.users || []).map((u: any) => [u.id, u]));
    return (data.data || []).map((c: any) => ({
      id: c.id,
      author: (users.get(c.author_id) as any)?.name || (users.get(c.author_id) as any)?.username || "Unknown",
      message: c.text,
      createdAt: c.created_at,
      replies: [],
    }));
  } catch (e) {
    console.error("Twitter comments fetch error:", e);
    return [];
  }
}

async function fetchLinkedInPostComments(accessToken: string, shareUrn: string | null | undefined) {
  if (!shareUrn) return [];
  try {
    const res = await fetch(
      `https://api.linkedin.com/rest/socialActions/${shareUrn}/comments?q=comments&start=0&count=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Linkedin-Version": "202510",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );
    const data = await res.json();
    return (data.elements || []).map((c: any) => ({
      id: c.id,
      author: c.creator?.localizedFirstName + " " + c.creator?.localizedLastName || "Unknown",
      message: c.message?.text || "",
      createdAt: c.created?.time || new Date().toISOString(),
      replies: [],
    }));
  } catch (e) {
    console.error("LinkedIn comments fetch error:", e);
    return [];
  }
}

async function fetchInstagramPostComments(accessToken: string, mediaId: string | null | undefined) {
  if (!mediaId) return [];
  try {
    const res = await fetch(
      `https://graph.facebook.com/v17.0/${mediaId}/comments?fields=from,text,timestamp&limit=50&access_token=${accessToken}`
    );
    const data = await res.json();
    return (data.data || []).map((c: any) => ({
      id: c.id,
      author: c.from?.username || "Unknown",
      message: c.text,
      createdAt: c.timestamp,
      replies: [],
    }));
  } catch (e) {
    console.error("Instagram comments fetch error:", e);
    return [];
  }
}

async function fetchYouTubePostComments(accessToken: string, videoId: string | null | undefined) {
  if (!videoId) return [];
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=snippet&maxResults=50&key=${process.env.YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    return (data.items || []).map((c: any) => ({
      id: c.id,
      author: c.snippet?.topLevelComment?.snippet?.authorDisplayName || "Unknown",
      message: c.snippet?.topLevelComment?.snippet?.textDisplay || "",
      createdAt: c.snippet?.topLevelComment?.snippet?.publishedAt,
      replies: [],
    }));
  } catch (e) {
    console.error("YouTube comments fetch error:", e);
    return [];
  }
}

async function fetchTikTokPostComments(accessToken: string, videoId: string | null | undefined) {
  if (!videoId) return [];
  try {
    const res = await fetch(
      `https://open.tiktokapis.com/v2/research/video/comment/list/?fields=create_time,text,user_id`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_info: {
            source_type: "video_id",
            video_id: videoId,
          },
          cursor: "0",
          count: "50",
        }),
      }
    );
    const data = await res.json();
    return (data.data?.comments || []).map((c: any) => ({
      id: c.id || c.user_id + c.create_time,
      author: "TikTok User",
      message: c.text,
      createdAt: new Date(Number.parseInt(c.create_time) * 1000).toISOString(),
      replies: [],
    }));
  } catch (e) {
    console.error("TikTok comments fetch error:", e);
    return [];
  }
}
