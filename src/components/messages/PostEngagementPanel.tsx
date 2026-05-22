"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type EngagementComment = {
  id: string;
  author: string;
  message: string;
  sentiment?: string;
  replies: { id: string; message: string; createdAt: string }[];
  createdAt?: string;
};

type EngagementData = {
  postId: string;
  likes: number;
  comments: EngagementComment[];
};

type SocialAccount = {
  id: string;
  accountName: string;
  platform: string;
};

export function PostEngagementPanel({
  postId,
  postPreview,
}: {
  postId: string;
  postPreview?: string;
}) {
  const { toast } = useToast();
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyAccountSelection, setReplyAccountSelection] = useState<
    Record<string, string>
  >({});
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/social-accounts");
      if (res.ok) {
        const data = await res.json();
        setSocialAccounts(
          (Array.isArray(data) ? data : []).filter((x) => x.isActive)
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    void fetch(`/api/posts/${postId}/engagement`)
      .then((r) => r.json())
      .then((data) => {
        if (data.postId) setEngagement(data);
        else setEngagement(null);
      })
      .finally(() => setLoading(false));
  }, [postId]);

  async function replyToComment(commentId: string) {
    const message = replyDraft[commentId];
    const socialAccountId = replyAccountSelection[commentId];
    if (!message?.trim()) return;
    if (!socialAccountId) {
      toast({
        title: "Account required",
        description: "Select which account to reply from.",
        variant: "destructive",
      });
      return;
    }

    const res = await fetch(`/api/posts/${postId}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reply",
        commentId,
        message: message.trim(),
        socialAccountId,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setEngagement(data);
      setReplyDraft((prev) => ({ ...prev, [commentId]: "" }));
    } else {
      toast({
        title: "Reply failed",
        description: data.error || "Could not post reply.",
        variant: "destructive",
      });
    }
  }

  async function analyzeSentiment() {
    setAnalyzing(true);
    const res = await fetch(`/api/posts/${postId}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "analyze" }),
    });
    const data = await res.json();
    if (res.ok) setEngagement(data);
    setAnalyzing(false);
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-gray-400">
        Loading engagement…
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-6 text-center text-sm text-gray-500">
        Could not load engagement for this post.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-5 py-4">
        {postPreview && (
          <p className="mb-2 line-clamp-2 text-xs text-gray-500">{postPreview}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Comments & reactions
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">👍 {engagement.likes} likes</span>
            <Button size="sm" variant="outline" onClick={analyzeSentiment} disabled={analyzing}>
              {analyzing ? "Analyzing…" : "AI sentiment"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {(engagement.comments || []).length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            No comments yet on this post.
          </p>
        ) : (
          engagement.comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">{comment.author}</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {comment.sentiment || "—"}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{comment.message}</p>
              {(comment.replies || []).map((r) => (
                <p
                  key={r.id}
                  className="mt-1 rounded-md bg-[#7331FF]/5 px-2 py-1 text-xs text-gray-600"
                >
                  ↳ {r.message}
                </p>
              ))}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  placeholder="Reply on platform…"
                  value={replyDraft[comment.id] || ""}
                  onChange={(e) =>
                    setReplyDraft((prev) => ({ ...prev, [comment.id]: e.target.value }))
                  }
                  className="text-black"
                />
                <select
                  value={replyAccountSelection[comment.id] || ""}
                  onChange={(e) =>
                    setReplyAccountSelection((prev) => ({
                      ...prev,
                      [comment.id]: e.target.value,
                    }))
                  }
                  className="rounded-md border border-gray-200 px-2 py-2 text-sm text-black"
                >
                  <option value="">Reply as…</option>
                  {socialAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.platform})
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={() => void replyToComment(comment.id)}>
                  Reply
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
