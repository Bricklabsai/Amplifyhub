import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getInboxConversationMessages,
  sendInboxConversationMessage,
} from "@/lib/zernio-inbox";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const cursor = searchParams.get("cursor") || undefined;

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  const owned = await prisma.socialAccount.findFirst({
    where: { userId, zernioAccountId: accountId },
  });
  if (!owned) {
    return NextResponse.json({ error: "Account not found" }, { status: 403 });
  }

  try {
    const { messages, nextCursor } = await getInboxConversationMessages(
      conversationId,
      accountId,
      { cursor }
    );
    return NextResponse.json({ messages, nextCursor });
  } catch (e) {
    console.error("[api/messages/inbox/[id] GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const body = await req.json();
  const { accountId, message, replyTo } = body as {
    accountId?: string;
    message?: string;
    replyTo?: string;
  };

  if (!accountId || !message?.trim()) {
    return NextResponse.json(
      { error: "accountId and message are required" },
      { status: 400 }
    );
  }

  const owned = await prisma.socialAccount.findFirst({
    where: { userId, zernioAccountId: accountId },
  });
  if (!owned) {
    return NextResponse.json({ error: "Account not found" }, { status: 403 });
  }

  try {
    const result = await sendInboxConversationMessage(
      conversationId,
      accountId,
      message,
      replyTo
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (e) {
    console.error("[api/messages/inbox/[id] POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send message" },
      { status: 500 }
    );
  }
}
