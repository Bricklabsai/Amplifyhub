import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/notification-prefs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  const stored = (user?.settings as Record<string, unknown> | null) ?? {};
  const notifications =
    (stored.notifications as typeof DEFAULT_NOTIFICATION_PREFS) ??
    DEFAULT_NOTIFICATION_PREFS;

  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const notifications = body.notifications;
  if (!notifications || typeof notifications !== "object") {
    return NextResponse.json(
      { error: "notifications object is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  const existing = (user?.settings as Record<string, unknown> | null) ?? {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      settings: {
        ...existing,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFS,
          ...notifications,
        },
      },
    },
  });

  return NextResponse.json({ notifications });
}
