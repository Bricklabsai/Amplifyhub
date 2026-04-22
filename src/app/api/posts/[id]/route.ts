import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body?.action === "publish") {
    const selectedSocialAccountIds = Array.isArray(body.selectedSocialAccountIds)
      ? (body.selectedSocialAccountIds as string[])
      : [];
    if (selectedSocialAccountIds.length === 0) {
      return NextResponse.json({ error: "Select at least one social account." }, { status: 400 });
    }

    const allowedAccounts = await prisma.socialAccount.findMany({
      where: {
        userId,
        isActive: true,
        id: { in: selectedSocialAccountIds },
      },
      select: { id: true, platform: true },
    });

    if (allowedAccounts.length === 0) {
      return NextResponse.json({ error: "No valid social accounts selected." }, { status: 400 });
    }

    const now = new Date();
    const content = typeof body.content === "string" && body.content.trim() ? body.content.trim() : post.content;
    const mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls : post.mediaUrls;

    const result = await prisma.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({
        where: { id },
        data: {
          content,
          mediaUrls,
          status: "PUBLISHED",
          publishedAt: now,
        },
      });

      for (const account of allowedAccounts) {
        const existingPlatformPost = await tx.platformPost.findFirst({
          where: { postId: id, socialAccountId: account.id },
          select: { id: true },
        });
        if (existingPlatformPost) {
          await tx.platformPost.update({
            where: { id: existingPlatformPost.id },
            data: {
              content,
              status: "PUBLISHED",
              publishedAt: now,
            },
          });
        } else {
          await tx.platformPost.create({
            data: {
              postId: id,
              socialAccountId: account.id,
              platform: account.platform,
              content,
              status: "PUBLISHED",
              publishedAt: now,
            },
          });
        }
      }

      return updatedPost;
    });

    return NextResponse.json(result);
  }

  const updated = await prisma.post.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
