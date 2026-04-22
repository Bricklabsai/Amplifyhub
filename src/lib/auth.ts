import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import TwitterProvider from "next-auth/providers/twitter";
import LinkedInProvider from "next-auth/providers/linkedin";
import InstagramProvider from "next-auth/providers/instagram";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import { refreshSocialProfile } from "./social";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
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
       profile(profile: any) {
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
        profile(profile: any) {
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
            scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
          },
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async linkAccount({ user, account, profile }) {
      const platformMap: Record<string, string> = {
        google: "YOUTUBE",
        facebook: "FACEBOOK",
        twitter: "TWITTER",
        linkedin: "LINKEDIN",
        instagram: "INSTAGRAM",
        tiktok: "TIKTOK",
        whatsapp: "WHATSAPP",
      };

      const platform = platformMap[account.provider];
      if (platform) {
        await prisma.socialAccount.upsert({
          where: {
            userId_platform: {
              userId: user.id,
              platform: platform as any,
            },
          },
          update: {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            accountName: (profile as any)?.name || (profile as any)?.screen_name || (profile as any)?.preferred_username || account.providerAccountId,
            accountId: account.providerAccountId,
            isActive: true,
          },
          create: {
            userId: user.id,
            platform: platform as any,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            accountName: (profile as any)?.name || (profile as any)?.screen_name || (profile as any)?.preferred_username || account.providerAccountId,
            accountId: account.providerAccountId,
            isActive: true,
          },
        });

        // Fetch profile data immediately
        try {
          const sa = await prisma.socialAccount.findUnique({
            where: { userId_platform: { userId: user.id, platform: platform as any } }
          });
          if (sa) await refreshSocialProfile(sa.id);
        } catch (e) {
          console.error("Failed to refresh profile after linking:", e);
        }
      }
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};