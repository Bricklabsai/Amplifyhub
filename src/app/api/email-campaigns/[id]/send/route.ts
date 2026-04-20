import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const campaign = await prisma.emailCampaign.findFirst({ where: { id: params.id, userId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Simulate sending
  await prisma.emailCampaign.update({
    where: { id: params.id },
    data: { status: "SENT", sentAt: new Date(), openRate: Math.random() * 0.4 + 0.2, clickRate: Math.random() * 0.1 + 0.05 },
  });

  return NextResponse.json({ success: true, message: "Campaign sent successfully (simulation)" });
}
