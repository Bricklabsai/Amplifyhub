import { prisma } from "./prisma";

export async function refreshSocialProfile(socialAccountId: string) {
  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    include: { user: true },
  });

  if (!account || !account.accessToken) return null;

  try {
    let profileData: { accountName?: string; followers?: number } = {};

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
    const res = await fetch("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return {
      accountName: `${data.localizedFirstName} ${data.localizedLastName}`,
      followers: 0, // LinkedIn followers API is more complex
    };
  } catch (e) {
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
      followers: parseInt(channel?.statistics?.subscriberCount || "0"),
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
