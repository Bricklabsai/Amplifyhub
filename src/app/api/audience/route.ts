import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const groups = await prisma.audienceGroup.findMany({
    where: { userId },
    include: { _count: { select: { contacts: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Fetch email stats per group: last campaign sent + avg open rate
  // We look at EmailCampaigns whose recipients include contacts from each group
  const groupIds = groups.map((g) => g.id);

  // For each group, find the most recent sent EmailCampaign that targeted it
  // via EmailCampaignRecipient → Contact → ContactGroup
  const emailStats = await prisma.$queryRaw<
    { groupId: string; lastSentAt: Date | null; avgOpenRate: number | null; campaignCount: number }[]
  >`
    SELECT
      cg."groupId",
      MAX(ec."sentAt") AS "lastSentAt",
      AVG(ec."openRate") AS "avgOpenRate",
      COUNT(DISTINCT ec.id)::int AS "campaignCount"
    FROM "ContactGroup" cg
    JOIN "EmailCampaignRecipient" ecr ON ecr."contactId" = cg."contactId"
    JOIN "EmailCampaign" ec ON ec.id = ecr."campaignId"
    WHERE cg."groupId" = ANY(${groupIds}::text[])
      AND ec."userId" = ${userId}
      AND ec."status" = 'SENT'
    GROUP BY cg."groupId"
  `;

  const statsMap = new Map(emailStats.map((s) => [s.groupId, s]));

  const result = groups.map((g) => {
    const stats = statsMap.get(g.id);
    return {
      ...g,
      emailStats: stats
        ? {
            lastSentAt: stats.lastSentAt,
            avgOpenRate: stats.avgOpenRate ? Number(stats.avgOpenRate) : 0,
            campaignCount: stats.campaignCount,
          }
        : null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { name, description, tags } = await req.json();
  const group = await prisma.audienceGroup.create({ data: { userId, name, description, tags: tags || [] } });
  return NextResponse.json(group, { status: 201 });
}
