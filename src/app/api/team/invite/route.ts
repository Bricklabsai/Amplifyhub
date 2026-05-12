import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          include: {
            owner: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }

    if (invite.expires < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      teamName: invite.team.name,
      inviterName: invite.team.owner.name,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to verify invite" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { email, role, organization } = await req.json();

  if (!email || !role) {
    return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
  }

  try {
    // 1. Get or create team for the owner
    let team = await prisma.team.findFirst({
      where: { ownerId: userId },
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: organization || `${session.user.name || "My"}'s Team`,
          ownerId: userId,
        },
      });
    }

    // 2. Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: team.id,
        user: { email: email.toLowerCase() },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member of this team" }, { status: 409 });
    }

    // 3. Create or update invite
    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days expiry

    const invite = await prisma.teamInvite.upsert({
      where: {
        teamId_email: {
          teamId: team.id,
          email: email.toLowerCase(),
        },
      },
      update: {
        role,
        token,
        expires,
      },
      create: {
        teamId: team.id,
        email: email.toLowerCase(),
        role,
        token,
        expires,
      },
    });

    // 4. Send invitation email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/auth/invite?token=${token}`;
    
    await sendInviteEmail(email, team.name, session.user.name || "Someone", inviteUrl);

    return NextResponse.json({ message: "Invitation sent successfully", invite });
  } catch (error: any) {
    console.error("Team invite error:", error);
    return NextResponse.json({ error: error.message || "Failed to send invitation" }, { status: 500 });
  }
}
