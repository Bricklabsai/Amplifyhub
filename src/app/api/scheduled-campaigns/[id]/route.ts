import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const schedule = await prisma.scheduledCampaign.findFirst({ where: { id, userId } });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.scheduledCampaign.delete({ where: { id } });
  return NextResponse.json({ success: true, message: "Scheduled campaign deleted" });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;
  const body = await req.json();

  const schedule = await prisma.scheduledCampaign.findFirst({ where: { id, userId } });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: any = {};
  if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;
  if (body.name) updateData.name = body.name;
  if (body.subject) updateData.subject = body.subject;
  if (body.frequency) updateData.frequency = body.frequency;
  if (body.nextRunAt) updateData.nextRunAt = new Date(body.nextRunAt);
  if (body.htmlContent) updateData.htmlContent = body.htmlContent;
  if (typeof body.templateId !== "undefined") updateData.templateId = body.templateId || null;

  const updated = await prisma.scheduledCampaign.update({ where: { id }, data: updateData });
  return NextResponse.json(updated);
}
