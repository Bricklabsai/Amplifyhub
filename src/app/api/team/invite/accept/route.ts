import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const userEmail = session.user.email;

  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { team: true }
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }

    if (invite.expires < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    if (invite.email.toLowerCase() !== userEmail?.toLowerCase()) {
      return NextResponse.json({ 
        error: `This invite was sent to ${invite.email}, but you are logged in as ${userEmail}. Please switch accounts.` 
      }, { status: 403 });
    }

    // Use transaction to add member and delete invite
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: userId,
          role: invite.role,
        }
      }),
      prisma.teamInvite.delete({
        where: { id: invite.id }
      })
    ]);

    return NextResponse.json({ message: "Joined team successfully" });
  } catch (error: any) {
    console.error("Accept invite error:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "You are already a member of this team" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to join team" }, { status: 500 });
  }
}
