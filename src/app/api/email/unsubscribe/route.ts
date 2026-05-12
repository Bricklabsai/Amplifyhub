import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email || !token) {
    return NextResponse.json({ success: false, message: "Missing unsubscribe parameters." }, { status: 400 });
  }

  try {
    const count = await prisma.$executeRaw`
      UPDATE "Contact"
      SET "isUnsubscribed" = true, "updatedAt" = NOW()
      WHERE "email" = ${email}
    `;

    if (count === 0) {
      return NextResponse.json({ success: false, message: "Email not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "You have been unsubscribed successfully." });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json({ success: false, message: "Unable to process unsubscribe request." }, { status: 500 });
  }
}
