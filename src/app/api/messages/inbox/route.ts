import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listInboxConversations } from "@/lib/zernio-inbox";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") || undefined;
  const cursor = searchParams.get("cursor") || undefined;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { zernioProfileId: true },
    });

    const accounts = await prisma.socialAccount.findMany({
      where: { userId, isActive: true, zernioAccountId: { not: null } },
      select: {
        id: true,
        platform: true,
        accountName: true,
        zernioAccountId: true,
      },
    });

    const accountByZernio = new Map(
      accounts
        .filter((a) => a.zernioAccountId)
        .map((a) => [a.zernioAccountId!, a])
    );

    const { conversations, nextCursor } = await listInboxConversations({
      profileId: user?.zernioProfileId || undefined,
      platform,
      cursor,
    });

    return NextResponse.json({
      conversations: conversations.map((c) => {
        const local = accountByZernio.get(c.accountId);
        return {
          ...c,
          localAccountId: local?.id,
          localPlatform: local?.platform,
          accountName: local?.accountName || c.platform,
        };
      }),
      nextCursor,
    });
  } catch (e) {
    console.error("[api/messages/inbox]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to load inbox conversations",
        conversations: [],
      },
      { status: 500 }
    );
  }
}
