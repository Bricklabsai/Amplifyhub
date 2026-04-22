import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { randomUUID } from "crypto";

type TeamMember = {
  id: string;
  ownerUserId: string;
  name: string;
  email: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  organization?: string;
  status: "INVITED" | "ACTIVE";
  invitedAt: string;
};

const FILE_NAME = "team-members.json";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerUserId = (session.user as any).id;
  const members = await readJsonStore<TeamMember[]>(FILE_NAME, []);
  return NextResponse.json(members.filter((m) => m.ownerUserId === ownerUserId));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerUserId = (session.user as any).id;
  const body = await req.json();
  const { name, email, role, organization } = body as Partial<TeamMember>;

  if (!name || !email || !role) {
    return NextResponse.json({ error: "Name, email and role are required." }, { status: 400 });
  }

  const members = await readJsonStore<TeamMember[]>(FILE_NAME, []);
  const exists = members.some((m) => m.ownerUserId === ownerUserId && m.email.toLowerCase() === email.toLowerCase());
  if (exists) return NextResponse.json({ error: "Team member already added." }, { status: 409 });

  const newMember: TeamMember = {
    id: randomUUID(),
    ownerUserId,
    name,
    email,
    role,
    organization: organization || "",
    status: "INVITED",
    invitedAt: new Date().toISOString(),
  };
  members.unshift(newMember);
  await writeJsonStore(FILE_NAME, members);
  return NextResponse.json(newMember, { status: 201 });
}
