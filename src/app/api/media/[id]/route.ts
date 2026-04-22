import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  const media = await prisma.media.findFirst({ where: { id, userId } });
  if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  if (media.url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", media.url);
    try {
      await unlink(filePath);
    } catch {
      // File may already be missing; keep deleting DB entry.
    }
  }

  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

