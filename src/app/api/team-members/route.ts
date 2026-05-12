import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { sendInviteEmail } from "@/lib/email";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  // Get teams owned by user or where user is a member
  const team = await prisma.team.findFirst({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            }
          }
        }
      },
      invites: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      }
    }
  });

  if (!team) return NextResponse.json([]);

  // Combine members and owner
  const allMembers = [
    {
      id: team.owner.id,
      name: team.owner.name || "Owner",
      email: team.owner.email,
      role: "ADMIN",
      status: "ACTIVE",
      invitedAt: team.createdAt.toISOString(),
    },
    ...team.members.map((m) => ({
      id: m.id,
      name: m.user.name || "User",
      email: m.user.email,
      role: m.role,
      status: "ACTIVE",
      invitedAt: m.createdAt.toISOString(),
    })),
    ...team.invites.map((i) => ({
      id: i.id,
      name: "Pending Invite",
      email: i.email,
      role: i.role,
      status: "INVITED",
      invitedAt: i.createdAt.toISOString(),
    }))
  ];

  return NextResponse.json(allMembers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await req.json();
  const { name, email, role, organization } = body;

  if (!email || !role) {
    return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
  }

  // Find or create team for the owner
  let team = await prisma.team.findFirst({
    where: { ownerId: userId }
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: organization || `${session.user.name || 'My'}'s Team`,
        ownerId: userId,
      }
    });
  }

  // Check if already a member
  const existingMember = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      user: { email: email.toLowerCase() }
    }
  });

  if (existingMember) {
    return NextResponse.json({ error: "Team member already exists." }, { status: 409 });
  }

  // Check if already invited
  const existingInvite = await prisma.teamInvite.findUnique({
    where: {
      teamId_email: {
        teamId: team.id,
        email: email.toLowerCase()
      }
    }
  });

  if (existingInvite) {
    return NextResponse.json({ error: "Invite already sent to this email." }, { status: 409 });
  }

  // Create invite
  const token = randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7); // 7 days expiry

  const invite = await prisma.teamInvite.create({
    data: {
      teamId: team.id,
      email: email.toLowerCase(),
      role: role as any,
      token,
      expires,
    }
  });

  // Send email
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/auth/accept-invite?token=${token}`;
  
  try {
    await sendInviteEmail(email, team.name, session.user.name || "A team owner", inviteUrl);
  } catch (error) {
    console.error("Failed to send invite email:", error);
    // We still created the invite, but the email failed.
  }

  return NextResponse.json({
    id: invite.id,
    name: name || "Pending Invite",
    email: invite.email,
    role: invite.role,
    status: "INVITED",
    invitedAt: invite.createdAt.toISOString(),
  }, { status: 201 });
}
