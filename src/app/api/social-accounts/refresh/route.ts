import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshSocialProfile } from "@/lib/social";
import { fetchZernioFollowerCounts } from "@/lib/zernio-engagement";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const accounts = await prisma.socialAccount.findMany({
    where: { userId },
  });

  // Hot path: any account with a zernioAccountId is refreshed in a single
  // Zernio batched call rather than one per platform.
  const zernioBacked = accounts.filter((a) => a.zernioAccountId);
  const legacy = accounts.filter((a) => !a.zernioAccountId);

  const refreshed: { id: string; status: "success" | "failed" }[] = [];

  if (zernioBacked.length > 0) {
    try {
      // Get the user's Zernio profile ID
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { zernioProfileId: true },
      });
      
      const stats = await fetchZernioFollowerCounts(zernioBacked, user?.zernioProfileId || undefined);
      // Update each account in parallel using whatever we got back. Accounts
      // missing from the response (e.g. Zernio still warming up follower data
      // for newly connected accounts) are recorded as failures.
      await Promise.all(
        zernioBacked.map(async (account) => {
          const remote = stats.get(account.id);
          if (!remote) {
            refreshed.push({ id: account.id, status: "failed" });
            return;
          }
          await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              accountName:
                remote.displayName || remote.username || account.accountName,
              followers: remote.followers,
              updatedAt: new Date(),
            },
          });
          refreshed.push({ id: account.id, status: "success" });
        })
      );
    } catch (error) {
      console.error("Zernio batch follower refresh failed:", error);
      for (const account of zernioBacked) {
        refreshed.push({ id: account.id, status: "failed" });
      }
    }
  }

  // Legacy direct-OAuth accounts still go through per-platform refresh.
  if (legacy.length > 0) {
    const results = await Promise.allSettled(
      legacy.map((account) => refreshSocialProfile(account.id))
    );
    legacy.forEach((account, i) => {
      refreshed.push({
        id: account.id,
        status: results[i].status === "fulfilled" ? "success" : "failed",
      });
    });
  }

  return NextResponse.json({
    message: "Profiles refreshed",
    results: refreshed,
  });
}
