import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { connectWithZernio } from "@/lib/services/connectAccount";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const accounts = await prisma.socialAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await req.json();
  const { platform, accountName, followers, zernioAccountId } = body;

  if (zernioAccountId) {
    const account = await connectWithZernio(userId, {
      zernioAccountId,
      accountName,
      platform,
    });
    return NextResponse.json(account, { status: 201 });
  }

  // Fallback for manual integration
  const existing = await prisma.socialAccount.findUnique({ where: { userId_platform: { userId, platform } } });
  if (existing) {
    const updated = await prisma.socialAccount.update({
      where: { id: existing.id },
      data: { accountName, isActive: true, followers: followers || existing.followers },
    });
    return NextResponse.json(updated);
  }

  const account = await prisma.socialAccount.create({
    data: { userId, platform, accountName, followers: followers || 0 },
  });
  return NextResponse.json(account, { status: 201 });
}
