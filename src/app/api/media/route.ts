import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const media = await prisma.media.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(media);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    const externalUrl = typeof body.externalUrl === "string" ? body.externalUrl.trim() : "";
    const inputType = typeof body.type === "string" ? body.type.toLowerCase() : "";
    const inputFilename = typeof body.filename === "string" ? body.filename.trim() : "";
    if (!externalUrl) {
      return NextResponse.json({ error: "externalUrl is required" }, { status: 400 });
    }
    try {
      const parsed = new URL(externalUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "Only http/https URLs are supported" }, { status: 400 });
      }
      const guessedType = inputType === "video" || /\.(mp4|mov|webm|ogg)(\?|$)/i.test(parsed.pathname) ? "video" : "image";
      const derivedFilename = inputFilename || parsed.pathname.split("/").pop() || `external-${Date.now()}`;
      const media = await prisma.media.create({
        data: {
          userId,
          url: externalUrl,
          type: guessedType,
          filename: derivedFilename,
          isAI: false,
        },
      });
      return NextResponse.json(media, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Invalid external URL" }, { status: 400 });
    }
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const extension = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const safeBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_");
  const filename = `${Date.now()}-${safeBaseName}${extension}`;
  const filePath = path.join(uploadDir, filename);

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));

  const url = `/uploads/${filename}`;
  const type = file.type.startsWith("video") ? "video" : "image";

  const media = await prisma.media.create({
    data: {
      userId,
      url,
      type,
      filename: file.name,
      size: file.size,
      isAI: false,
    },
  });

  return NextResponse.json(media, { status: 201 });
}
