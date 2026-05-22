"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HiChat, HiInbox, HiRefresh } from "react-icons/hi";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PostEngagementPanel } from "@/components/messages/PostEngagementPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type PublishedPost = {
  id: string;
  content: string;
  publishedAt?: string;
  platformPosts?: { likes: number; comments: number; platform: string }[];
};

type InboxConversation = {
  id: string;
  accountId: string;
  platform?: string;
  accountName?: string;
  participantName?: string;
  participantUsername?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
};

type InboxMessage = {
  id: string;
  message?: string;
  fromMe?: boolean;
  createdAt?: string;
  authorName?: string;
};

function MessagesContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [tab, setTab] = useState<"posts" | "inbox">("posts");

  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState("");

  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [selectedConvo, setSelectedConvo] = useState<InboxConversation | null>(null);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [dmDraft, setDmDraft] = useState("");
  const [sendingDm, setSendingDm] = useState(false);

  useEffect(() => {
    const postParam = searchParams.get("post");
    if (postParam) {
      setTab("posts");
      setSelectedPostId(postParam);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadPublishedPosts();
  }, []);

  useEffect(() => {
    if (tab === "inbox") void loadInbox();
  }, [tab]);

  async function loadPublishedPosts() {
    setPostsLoading(true);
    const res = await fetch("/api/posts?status=PUBLISHED");
    const data = await res.json();
    const list = (data.posts || []) as PublishedPost[];
    setPosts(list);
    if (!selectedPostId && list.length > 0) {
      setSelectedPostId(list[0].id);
    }
    setPostsLoading(false);
  }

  async function loadInbox() {
    setInboxLoading(true);
    try {
      const res = await fetch("/api/messages/inbox");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load inbox");
      setConversations(data.conversations || []);
    } catch (e) {
      toast({
        title: "Inbox unavailable",
        description:
          e instanceof Error ? e.message : "Connect accounts via Zernio to view DMs.",
        variant: "destructive",
      });
      setConversations([]);
    } finally {
      setInboxLoading(false);
    }
  }

  async function loadConversationMessages(convo: InboxConversation) {
    setSelectedConvo(convo);
    setMessagesLoading(true);
    setInboxMessages([]);
    try {
      const res = await fetch(
        `/api/messages/inbox/${encodeURIComponent(convo.id)}?accountId=${encodeURIComponent(convo.accountId)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInboxMessages(data.messages || []);
    } catch (e) {
      toast({
        title: "Could not load messages",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setMessagesLoading(false);
    }
  }

  async function sendDm() {
    if (!selectedConvo || !dmDraft.trim()) return;
    setSendingDm(true);
    try {
      const res = await fetch(
        `/api/messages/inbox/${encodeURIComponent(selectedConvo.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedConvo.accountId,
            message: dmDraft.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDmDraft("");
      await loadConversationMessages(selectedConvo);
    } catch (e) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Could not send message",
        variant: "destructive",
      });
    } finally {
      setSendingDm(false);
    }
  }

  function postEngagementSummary(post: PublishedPost) {
    const pps = post.platformPosts || [];
    const likes = pps.reduce((s, p) => s + (p.likes ?? 0), 0);
    const comments = pps.reduce((s, p) => s + (p.comments ?? 0), 0);
    return { likes, comments };
  }

  const selectedPost = posts.find((p) => p.id === selectedPostId);

  return (
    <div className="max-w-7xl space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Messages
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Post comments and direct messages from your connected social accounts
          </p>
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("posts")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              tab === "posts" ? "brand-gradient-bg text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <HiChat />
            Post engagement
          </button>
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              tab === "inbox" ? "brand-gradient-bg text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <HiInbox />
            Direct inbox
          </button>
        </div>
      </div>

      <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:grid-cols-[300px_1fr]">
        {/* Left list */}
        <div className="border-b border-gray-100 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {tab === "posts" ? "Published posts" : "Conversations"}
            </span>
            <button
              type="button"
              onClick={() =>
                tab === "posts" ? void loadPublishedPosts() : void loadInbox()
              }
              className="text-[#7331FF] hover:opacity-80"
              aria-label="Refresh"
            >
              <HiRefresh className={cn("text-lg", (postsLoading || inboxLoading) && "animate-spin")} />
            </button>
          </div>

          <div className="max-h-[480px] overflow-y-auto">
            {tab === "posts" ? (
              postsLoading ? (
                <p className="p-4 text-sm text-gray-400">Loading posts…</p>
              ) : posts.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No published posts yet.</p>
              ) : (
                posts.map((post) => {
                  const { likes, comments } = postEngagementSummary(post);
                  const active = post.id === selectedPostId;
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPostId(post.id)}
                      className={cn(
                        "w-full border-b border-gray-50 px-4 py-3 text-left transition-colors",
                        active ? "bg-[#7331FF]/8" : "hover:bg-gray-50"
                      )}
                    >
                      <p className="line-clamp-2 text-sm font-medium text-gray-900">
                        {post.content}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {post.publishedAt ? formatRelative(post.publishedAt) : "Published"}
                        {" · "}👍 {likes} · 💬 {comments}
                      </p>
                    </button>
                  );
                })
              )
            ) : inboxLoading ? (
              <p className="p-4 text-sm text-gray-400">Loading inbox…</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                No direct messages found. Ensure accounts are connected through Zernio.
              </p>
            ) : (
              conversations.map((convo) => {
                const active = selectedConvo?.id === convo.id;
                const name =
                  convo.participantName ||
                  convo.participantUsername ||
                  "Unknown";
                return (
                  <button
                    key={`${convo.id}-${convo.accountId}`}
                    type="button"
                    onClick={() => void loadConversationMessages(convo)}
                    className={cn(
                      "w-full border-b border-gray-50 px-4 py-3 text-left transition-colors",
                      active ? "bg-[#7331FF]/8" : "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{name}</p>
                      {(convo.unreadCount ?? 0) > 0 && (
                        <span className="rounded-full bg-[#7331FF] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {convo.accountName} · {convo.platform}
                    </p>
                    {convo.lastMessage && (
                      <p className="mt-1 line-clamp-1 text-xs text-gray-400">
                        {convo.lastMessage}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="min-h-[400px]">
          {tab === "posts" ? (
            selectedPostId && selectedPost ? (
              <PostEngagementPanel
                postId={selectedPostId}
                postPreview={selectedPost.content}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-sm text-gray-400">
                Select a published post to view engagement
              </div>
            )
          ) : selectedConvo ? (
            <div className="flex h-full min-h-[400px] flex-col">
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="font-bold text-gray-900">
                  {selectedConvo.participantName ||
                    selectedConvo.participantUsername ||
                    "Conversation"}
                </h3>
                <p className="text-xs text-gray-500">
                  via {selectedConvo.accountName} ({selectedConvo.platform})
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {messagesLoading ? (
                  <p className="text-sm text-gray-400">Loading messages…</p>
                ) : inboxMessages.length === 0 ? (
                  <p className="text-sm text-gray-400">No messages in this thread.</p>
                ) : (
                  inboxMessages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                        m.fromMe
                          ? "ml-auto bg-[#7331FF] text-white"
                          : "bg-gray-100 text-gray-800"
                      )}
                    >
                      {!m.fromMe && m.authorName && (
                        <p className="mb-0.5 text-xs font-semibold opacity-70">
                          {m.authorName}
                        </p>
                      )}
                      <p>{m.message || "—"}</p>
                      {m.createdAt && (
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            m.fromMe ? "text-white/70" : "text-gray-400"
                          )}
                        >
                          {formatRelative(m.createdAt)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 border-t border-gray-100 p-4">
                <Input
                  placeholder="Type a message…"
                  value={dmDraft}
                  onChange={(e) => setDmDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendDm();
                    }
                  }}
                  className="text-black"
                />
                <Button
                  onClick={() => void sendDm()}
                  disabled={sendingDm || !dmDraft.trim()}
                  className="brand-gradient-bg shrink-0 border-0 text-white hover:opacity-90"
                >
                  {sendingDm ? "…" : "Send"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-sm text-gray-400">
              Select a conversation to view direct messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400">Loading messages…</div>}>
      <MessagesContent />
    </Suspense>
  );
}
