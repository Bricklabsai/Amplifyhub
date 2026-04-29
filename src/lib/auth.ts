import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import TwitterProvider from "next-auth/providers/twitter";
import LinkedInProvider from "next-auth/providers/linkedin";
import InstagramProvider from "next-auth/providers/instagram";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Platform } from "@/generated/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import { refreshSocialProfile } from "./social";

type TwitterProfile = {
  data: {
    id: string;
    name?: string | null;
    profile_image_url?: string | null;
  };
};

type TikTokProfile = {
  data: {
    user: {
      open_id: string;
      display_name?: string | null;
      avatar_url?: string | null;
    };
  };
};

type LinkedProfile = {
  name?: string | null;
  screen_name?: string | null;
  preferred_username?: string | null;
};

type OAuthAccount = {
  provider: string;
  providerAccountId: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number | null;
};

type SessionUserWithRole = {
  id?: string;
  role?: string;
};

type UserWithRole = {
  role?: string;
};

const platformMap: Record<string, Platform> = {
  google: "YOUTUBE",
  facebook: "FACEBOOK",
  twitter: "TWITTER",
  linkedin: "LINKEDIN",
  instagram: "INSTAGRAM",
  tiktok: "TIKTOK",
  whatsapp: "WHATSAPP",
};

async function syncSocialAccountFromOAuth(
  userId: string,
  account: OAuthAccount,
  profile: LinkedProfile | undefined,
  source: "signIn" | "linkAccount"
) {
  const platform = platformMap[account.provider];
  if (!platform) {
    return;
  }

  console.log(`[${source}] Syncing social account:`, {
    userId,
    platform,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    hasAccessToken: !!account.access_token,
    hasRefreshToken: !!account.refresh_token,
    expiresAt: account.expires_at,
  });

  const updateData = {
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
    accountName:
      profile?.name ||
      profile?.screen_name ||
      profile?.preferred_username ||
      account.providerAccountId,
    accountId: account.providerAccountId,
    isActive: true,
  };

  const existing = await prisma.socialAccount.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  const result = existing
    ? await prisma.socialAccount.update({
        where: { id: existing.id },
        data: updateData,
      })
    : await prisma.socialAccount.create({
        data: {
          userId,
          platform,
          ...updateData,
          followers: 0,
        },
      });

  try {
    await refreshSocialProfile(result.id);
  } catch (error) {
    console.error(`Failed to refresh profile after ${source}:`, error);
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    ...(process.env.FACEBOOK_CLIENT_ID ? [
      FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      })
    ] : []),
    ...(process.env.TWITTER_CLIENT_ID ? [
      TwitterProvider({
        clientId: (process.env.TWITTER_CLIENT_ID || "").trim(),
        clientSecret: (process.env.TWITTER_CLIENT_SECRET || "").trim(),
        version: "2.0",
        authorization: {
          params: {
            scope: "users.read offline.access",
          },
        },
        checks: ["pkce", "state"],
        profile(profile: TwitterProfile) {
          return {
            id: profile.data.id,
            name: profile.data.name,
            email: null,
            image: profile.data.profile_image_url,
          };
        },
      })
    ] : []),
    ...(process.env.LINKEDIN_CLIENT_ID ? [
      LinkedInProvider({
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
      })
    ] : []),
    ...(process.env.INSTAGRAM_CLIENT_ID ? [
      InstagramProvider({
        clientId: process.env.INSTAGRAM_CLIENT_ID,
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "",
      })
    ] : []),
    ...(process.env.TIKTOK_CLIENT_ID ? [
      {
        id: "tiktok",
        name: "TikTok",
        type: "oauth" as const,
        authorization: {
          url: "https://www.tiktok.com/v2/auth/authorize/",
          params: {
            client_key: process.env.TIKTOK_CLIENT_ID,
            scope: "user.info.basic,video.list,video.upload",
            response_type: "code",
          },
        },
        token: "https://open.tiktokapis.com/v2/oauth/token/",
        userinfo: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
        profile(profile: TikTokProfile) {
          return {
            id: profile.data.user.open_id,
            name: profile.data.user.display_name,
            email: null,
            image: profile.data.user.avatar_url,
          };
        },
        clientId: process.env.TIKTOK_CLIENT_ID,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      }
    ] : []),
     ...(process.env.YOUTUBE_CLIENT_ID ? [
       GoogleProvider({
         id: "google",
         name: "YouTube",
         clientId: process.env.YOUTUBE_CLIENT_ID,
         clientSecret: process.env.YOUTUBE_CLIENT_SECRET || "",
         authorization: {
           params: {
             scope: "openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl",
             prompt: "consent",
             access_type: "offline",
             response_type: "code",
           },
         },
         profile(profile) {
           return {
             id: profile.sub,
             name: profile.name,
             email: profile.email,
             image: profile.picture,
           };
         },
       })
     ] : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("Authorize called with:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing email or password");
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          console.log("User not found or no password for:", credentials.email);
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        console.log("Password is valid:", isValid);

        if (!isValid) {
          console.log("Invalid password for:", credentials.email);
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider && user.id) {
        try {
          await syncSocialAccountFromOAuth(
            user.id,
            account,
            profile as LinkedProfile | undefined,
            "signIn"
          );
        } catch (error) {
          console.error("[signIn] Failed to sync social account:", error);
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as UserWithRole).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const sessionUser = session.user as SessionUserWithRole;
        sessionUser.id = token.id as string;
        sessionUser.role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async linkAccount({ user, account, profile }) {
      try {
        await syncSocialAccountFromOAuth(
          user.id,
          account,
          profile as LinkedProfile | undefined,
          "linkAccount"
        );
      } catch (error) {
        console.error("[linkAccount] FAILED:", error);
      }
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};