import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id, userId },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.emailCampaign.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, message: "Campaign deleted" });
}
