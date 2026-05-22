import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const team = await prisma.team.findFirst({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      invites: { select: { id: true, email: true, role: true, createdAt: true } },
    },
  });

  if (!team) {
    return NextResponse.json({
      team: null,
      isOwner: true,
      canManageTeam: true,
    });
  }

  const isOwner = team.ownerId === userId;

  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      createdAt: team.createdAt,
      owner: team.owner,
      members: team.members.map((m) => ({
        id: m.id,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
        joinedAt: m.createdAt,
      })),
      pendingInvites: team.invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        invitedAt: i.createdAt,
      })),
    },
    isOwner,
    canManageTeam: isOwner,
  });
}
