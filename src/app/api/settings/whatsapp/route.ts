import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { phoneNumberId, wabaId, accessToken } = await req.json();

    if (!phoneNumberId || !wabaId || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const encryptedToken = encrypt(accessToken);

    const config = await prisma.whatsappConfig.upsert({
      where: { userId },
      update: {
        phoneNumberId,
        wabaId,
        accessToken: encryptedToken,
      },
      create: {
        userId,
        phoneNumberId,
        wabaId,
        accessToken: encryptedToken,
      },
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp configuration saved successfully",
    });
  } catch (error) {
    console.error("Error saving WhatsApp config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const config = await prisma.whatsappConfig.findUnique({
      where: { userId },
      select: {
        phoneNumberId: true,
        wabaId: true,
        // We don't return the access token for security
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}
