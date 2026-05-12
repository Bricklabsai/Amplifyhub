import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const templates = await prisma.emailTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const { name, description, category, htmlContent } = body;

  if (!name || !htmlContent) {
    return NextResponse.json({ error: "Template name and HTML content are required" }, { status: 400 });
  }

  const template = await prisma.emailTemplate.create({
    data: {
      userId,
      name,
      description: description || "",
      category: category || "CUSTOM",
      htmlContent,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
