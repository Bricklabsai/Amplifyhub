import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getZernioClient } from "@/lib/zernio";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { id } = await params;
  const account = await prisma.socialAccount.findFirst({
    where: { id, userId },
  });
  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Revoke the connection on Zernio's side first so the social platform's
  // OAuth grant is cleaned up. We never block the local delete on a Zernio
  // failure (e.g. account already revoked, transient 5xx) — instead we log
  // and continue so the user is never stranded with an orphan record.
  if (account.zernioAccountId) {
    try {
      const zernio = getZernioClient();
      const result = await zernio.accounts.deleteAccount({
        path: { accountId: account.zernioAccountId },
      });
      if (result.error) {
        console.error(
          `Zernio.deleteAccount(${account.zernioAccountId}) returned error:`,
          result.error
        );
      }
    } catch (err) {
      console.error(
        `Zernio.deleteAccount(${account.zernioAccountId}) threw:`,
        err
      );
    }
  }

  // Map platform to NextAuth provider so we can also clean up the underlying
  // NextAuth Account row (legacy native OAuth flow). Safe to keep alongside
  // the Zernio cleanup: a SocialAccount can only have come from one of them.
  const platformToProvider: Record<string, string> = {
    YOUTUBE: "google",
    FACEBOOK: "facebook",
    TWITTER: "twitter",
    LINKEDIN: "linkedin",
    INSTAGRAM: "instagram",
    TIKTOK: "tiktok",
    WHATSAPP: "whatsapp",
  };
  const provider = platformToProvider[account.platform];

  await prisma.$transaction([
    prisma.platformPost.deleteMany({ where: { socialAccountId: id } }),
    prisma.socialAccount.delete({ where: { id } }),
    ...(provider
      ? [
          prisma.account.deleteMany({
            where: {
              userId,
              provider,
            },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ success: true });
}
