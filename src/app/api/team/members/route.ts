import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const team = await prisma.team.findFirst({
      where: { ownerId: userId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        invites: true,
      },
    });

    if (!team) {
      return NextResponse.json({ members: [], invites: [] });
    }

    // Combine members and invites for the UI
    const formattedMembers = team.members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: "ACTIVE",
      createdAt: m.createdAt,
    }));

    const formattedInvites = team.invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: "INVITED",
      createdAt: i.createdAt,
      expires: i.expires,
    }));

    return NextResponse.json({
      teamId: team.id,
      teamName: team.name,
      members: [...formattedMembers, ...formattedInvites],
    });
  } catch (error: any) {
    console.error("Fetch team members error:", error);
    return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type"); // "member" or "invite"

  if (!id || !type) {
    return NextResponse.json({ error: "ID and type are required" }, { status: 400 });
  }

  try {
    const team = await prisma.team.findFirst({
      where: { ownerId: userId },
    });

    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    if (type === "member") {
      await prisma.teamMember.delete({
        where: { id, teamId: team.id },
      });
    } else {
      await prisma.teamInvite.delete({
        where: { id, teamId: team.id },
      });
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
