import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectWithZernio } from "@/lib/services/connectAccount";
import { prisma } from "@/lib/prisma";
import {
  fromZernioPlatform,
  getAppBaseUrl,
  getZernioClient,
  getZernioProfileId,
} from "@/lib/zernio";

export const dynamic = "force-dynamic";

const SUCCESS_REDIRECT = "/social-accounts?success=true";
const FAILURE_REDIRECT = "/social-accounts?error=auth_failed";
const LOGIN_REDIRECT = "/auth/login";

function redirect(path: string, base: string) {
  return NextResponse.redirect(new URL(path, base));
}

type ResolvedAccount = {
  zernioAccountId: string;
  zernioPlatform: string;
  username?: string;
};

/**
 * For platforms that need an extra selection step (Facebook pages, LinkedIn
 * orgs, Pinterest boards, etc.), Zernio handles the picker on its own UI but
 * doesn't always echo the resulting `accountId` back to us in the redirect.
 * Instead it just sends `?connected=<platform>&profileId=…&username=<name>`.
 *
 * We recover the freshly created Zernio SocialAccount by listing accounts
 * scoped to our profileId + platform and matching on the supplied username
 * (display name). If exactly one is unaccounted-for in our local DB we use
 * it; otherwise we prefer a name match, falling back to the most recently
 * connected account.
 */
async function resolveAccountIdViaList(
  userId: string,
  zernioPlatform: string,
  username: string | undefined
): Promise<string | null> {
  const zernio = getZernioClient();
  const list = await zernio.accounts.listAccounts({
    query: {
      profileId: getZernioProfileId(),
      platform: zernioPlatform,
    },
  });

  if (list.error) {
    console.error("Zernio.listAccounts failed:", list.error);
    return null;
  }
  type ZernioListedAccount = {
    _id?: string;
    username?: string;
    displayName?: string;
  };
  const accounts = (list.data?.accounts ?? []) as ZernioListedAccount[];
  if (accounts.length === 0) return null;

  // Skip accounts we've already linked locally — whatever's left should be
  // the one Zernio just created from the OAuth flow.
  const knownIds = new Set(
    (
      await prisma.socialAccount.findMany({
        where: { userId, zernioAccountId: { not: null } },
        select: { zernioAccountId: true },
      })
    )
      .map((a) => a.zernioAccountId)
      .filter((id): id is string => Boolean(id))
  );

  const newAccounts = accounts.filter(
    (a: ZernioListedAccount) => a._id && !knownIds.has(a._id)
  );
  const candidates = newAccounts.length > 0 ? newAccounts : accounts;

  // Prefer a display-name / handle match against the redirect's `username`.
  if (username) {
    const lc = username.toLowerCase();
    const matched = candidates.find((a: ZernioListedAccount) => {
      const dn = (a.displayName || "").toLowerCase();
      const un = (a.username || "").toLowerCase();
      return dn === lc || un === lc;
    });
    if (matched?._id) return matched._id;
  }

  return candidates[0]?._id ?? null;
}

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl();

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return redirect(LOGIN_REDIRECT, baseUrl);
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return redirect(LOGIN_REDIRECT, baseUrl);
  }

  const params = req.nextUrl.searchParams;

  try {
    let resolved: ResolvedAccount | null = null;

    /**
     * Standard Zernio connect flow with a directly-resolved account
     * (e.g. Twitter, single-account YouTube): the redirect carries the
     * resolved details right on the query string.
     */
    const directAccountId = params.get("accountId");
    if (directAccountId) {
      const platform =
        params.get("connected") || params.get("platform") || undefined;
      if (!platform) {
        throw new Error("Zernio redirect missing platform");
      }
      resolved = {
        zernioAccountId: directAccountId,
        zernioPlatform: platform,
        username: params.get("username") || undefined,
      };
    }

    /**
     * Standard flow with selection step (Facebook pages, LinkedIn orgs,
     * Pinterest boards, Snapchat profiles, Google Business locations).
     * Zernio runs the picker UI for us but the redirect comes back with
     * `connected` + `profileId` + `username` and no `accountId`. We
     * recover the freshly-created account by listing accounts on Zernio.
     */
    if (!resolved) {
      const connectedPlatform = params.get("connected");
      if (connectedPlatform) {
        const accountId = await resolveAccountIdViaList(
          userId,
          connectedPlatform,
          params.get("username") || undefined
        );
        if (accountId) {
          resolved = {
            zernioAccountId: accountId,
            zernioPlatform: connectedPlatform,
            username: params.get("username") || undefined,
          };
        } else {
          throw new Error(
            "Zernio finished the OAuth handshake but no matching account was found. Please try again or pick a page in Zernio's connect dialog."
          );
        }
      }
    }

    /**
     * Headless connect flow: Zernio redirects with raw OAuth `code`/`state`
     * and we delegate the exchange to the SDK so we never touch the
     * platform's client secret directly.
     */
    if (!resolved) {
      const code = params.get("code");
      const state = params.get("state");
      const platformParam = params.get("platform");
      if (!code || !state || !platformParam) {
        throw new Error("Missing required OAuth callback parameters");
      }

      const zernio = getZernioClient();
      const result = await zernio.connect.handleOAuthCallback({
        path: { platform: platformParam },
        body: { code, state, profileId: getZernioProfileId() },
      });

      if (result.error) {
        console.error("Zernio.handleOAuthCallback failed:", result.error);
        throw new Error("Zernio OAuth callback rejected");
      }

      const data = (result.data ?? {}) as {
        accountId?: string;
        platform?: string;
        username?: string;
      };

      if (!data.accountId) {
        throw new Error("Zernio did not return a complete account payload");
      }

      resolved = {
        zernioAccountId: data.accountId,
        zernioPlatform: data.platform || platformParam,
        username: data.username,
      };
    }

    const platform = fromZernioPlatform(resolved.zernioPlatform);
    if (!platform) {
      throw new Error(
        `Unsupported platform from Zernio: ${resolved.zernioPlatform}`
      );
    }

    await connectWithZernio(userId, {
      zernioAccountId: resolved.zernioAccountId,
      accountName: resolved.username || resolved.zernioAccountId,
      platform,
    });

    return redirect(SUCCESS_REDIRECT, baseUrl);
  } catch (err) {
    console.error("Zernio callback error:", err);
    return redirect(FAILURE_REDIRECT, baseUrl);
  }
}
