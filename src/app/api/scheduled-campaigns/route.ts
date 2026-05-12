import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const schedules = await prisma.scheduledCampaign.findMany({
    where: { userId },
    orderBy: { nextRunAt: "asc" },
  });

  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await req.json();

  const { name, subject, htmlContent, frequency, nextRunAt, sourceType, sourceData, templateId } = body;

  if (!name || !subject || !htmlContent) {
    return NextResponse.json({ error: "Name, subject, and content are required" }, { status: 400 });
  }

  const schedule = await prisma.scheduledCampaign.create({
    data: {
      userId,
      name,
      subject,
      htmlContent,
      frequency: frequency || "WEEKLY",
      sourceType: sourceType || "custom",
      sourceData: sourceData || null,
      templateId: (templateId && templateId !== "none") ? templateId : null,
      nextRunAt: nextRunAt ? new Date(nextRunAt) : new Date(),
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}
