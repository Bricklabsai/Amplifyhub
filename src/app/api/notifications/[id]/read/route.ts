import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ params is now a Promise
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params; // ✅ await params
  const userId = (session.user as any).id;

  if (id === "all") {
    await prisma.notification.updateMany({
      where: { userId },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}