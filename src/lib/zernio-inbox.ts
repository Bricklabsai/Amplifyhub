import { randomUUID } from "node:crypto";
import { getZernioClient, getZernioProfileId } from "./zernio";

export type InboxConversation = {
  id: string;
  accountId: string;
  platform?: string;
  participantName?: string;
  participantUsername?: string;
  participantAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  status?: string;
};

export type InboxMessage = {
  id: string;
  message?: string;
  fromMe?: boolean;
  createdAt?: string;
  platformMessageId?: string;
  authorName?: string;
};

function pickString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

export async function listInboxConversations(options?: {
  profileId?: string;
  platform?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ conversations: InboxConversation[]; nextCursor?: string }> {
  const zernio = getZernioClient();
  const profileId = options?.profileId || getZernioProfileId();

  const result = await zernio.messages.listInboxConversations({
    query: {
      profileId,
      platform: options?.platform,
      limit: options?.limit ?? 50,
      cursor: options?.cursor,
      sortOrder: "desc",
    },
  });

  if (result.error) {
    console.error("[inbox] listInboxConversations:", result.error);
    return { conversations: [] };
  }

  type RawConv = {
    id?: string;
    conversationId?: string;
    accountId?: string;
    platform?: string;
    participant?: {
      name?: string;
      username?: string;
      displayName?: string;
      avatarUrl?: string;
      profilePicture?: string;
    };
    lastMessage?: { text?: string; message?: string; createdAt?: string };
    preview?: string;
    updatedAt?: string;
    unreadCount?: number;
    status?: string;
  };

  const raw = (result.data?.conversations ??
    result.data?.data ??
    result.data ??
    []) as RawConv[];

  const list = Array.isArray(raw) ? raw : [];

  const conversations: InboxConversation[] = list
    .map((c) => ({
      id: pickString(c.id, c.conversationId) || "",
      accountId: c.accountId || "",
      platform: c.platform,
      participantName: pickString(
        c.participant?.name,
        c.participant?.displayName
      ),
      participantUsername: c.participant?.username,
      participantAvatar: pickString(
        c.participant?.avatarUrl,
        c.participant?.profilePicture
      ),
      lastMessage: pickString(
        c.lastMessage?.text,
        c.lastMessage?.message,
        c.preview
      ),
      lastMessageAt: pickString(c.lastMessage?.createdAt, c.updatedAt),
      unreadCount: c.unreadCount,
      status: c.status,
    }))
    .filter((c) => c.id && c.accountId);

  const nextCursor =
    (result.data as { pagination?: { nextCursor?: string } })?.pagination
      ?.nextCursor ?? undefined;

  return { conversations, nextCursor };
}

export async function getInboxConversationMessages(
  conversationId: string,
  zernioAccountId: string,
  options?: { cursor?: string; limit?: number }
): Promise<{ messages: InboxMessage[]; nextCursor?: string }> {
  const zernio = getZernioClient();

  const result = await zernio.messages.getInboxConversationMessages({
    path: { conversationId },
    query: {
      accountId: zernioAccountId,
      limit: options?.limit ?? 100,
      cursor: options?.cursor,
      sortOrder: "asc",
    },
  });

  if (result.error) {
    console.error("[inbox] getInboxConversationMessages:", result.error);
    return { messages: [] };
  }

  type RawMsg = {
    id?: string;
    messageId?: string;
    text?: string;
    message?: string;
    body?: string;
    fromMe?: boolean;
    isFromMe?: boolean;
    direction?: string;
    createdAt?: string;
    timestamp?: string;
    platformMessageId?: string;
    from?: { name?: string; username?: string };
    sender?: { name?: string };
  };

  const raw = (result.data?.messages ??
    result.data?.data ??
    result.data ??
    []) as RawMsg[];

  const list = Array.isArray(raw) ? raw : [];

  const messages: InboxMessage[] = list.map((m) => ({
    id: pickString(m.id, m.messageId, m.platformMessageId) || randomUUID(),
    message: pickString(m.text, m.message, m.body),
    fromMe: m.fromMe ?? m.isFromMe ?? m.direction === "outbound",
    createdAt: pickString(m.createdAt, m.timestamp),
    platformMessageId: m.platformMessageId,
    authorName: pickString(m.from?.name, m.from?.username, m.sender?.name),
  }));

  const nextCursor =
    (result.data as { pagination?: { nextCursor?: string } })?.pagination
      ?.nextCursor ?? undefined;

  return { messages, nextCursor };
}

export async function sendInboxConversationMessage(
  conversationId: string,
  zernioAccountId: string,
  message: string,
  replyTo?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const zernio = getZernioClient();

  const result = await zernio.messages.sendInboxMessage({
    path: { conversationId },
    body: {
      accountId: zernioAccountId,
      message: message.trim(),
      ...(replyTo ? { replyTo } : {}),
    },
  });

  if (result.error) {
    const err = result.error as { message?: string; error?: string };
    return {
      success: false,
      error: err.message || err.error || "Failed to send message",
    };
  }

  const data = result.data as { messageId?: string; id?: string };
  return {
    success: true,
    messageId: data?.messageId || data?.id,
  };
}
