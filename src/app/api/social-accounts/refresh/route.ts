import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshSocialProfile } from "@/lib/social";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const accounts = await prisma.socialAccount.findMany({
    where: { userId },
  });

  const results = await Promise.allSettled(
    accounts.map((account) => refreshSocialProfile(account.id))
  );

  return NextResponse.json({
    message: "Profiles refreshed",
    results: results.map((r) => (r.status === "fulfilled" ? "success" : "failed")),
  });
}
