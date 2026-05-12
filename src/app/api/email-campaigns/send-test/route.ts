import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendBulkEmails } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const body = await req.json();
  const { subject, htmlContent, previewText } = body;

  if (!user.email) {
    return NextResponse.json(
      { error: "User email not available" },
      { status: 400 }
    );
  }

  try {
    // Get full user data for personalization
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const firstName = fullUser.name ? fullUser.name.split(" ")[0] : "there";
    const lastName = fullUser.name ? fullUser.name.split(" ").slice(1).join(" ") : "";

    // Send test email to user
    const result = await sendBulkEmails({
      to: [
        {
          email: fullUser.email,
          firstName,
          lastName,
          company: undefined,
        },
      ],
      subject: subject || "Test Email",
      content: htmlContent,
      textContent: undefined,
      campaignId: undefined,
    });

    if (result.success) {
      return NextResponse.json(
        { message: "Test email sent successfully", result },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "Failed to send test email", details: result },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
