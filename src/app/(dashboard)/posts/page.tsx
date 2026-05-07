"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HiSearch, HiPlus, HiTrash, HiEye, HiPaperAirplane } from "react-icons/hi";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  DRAFT: "bg-gray-100 text-gray-600",
  FAILED: "bg-red-100 text-red-700",
};

const STATUS_FILTERS = ["all", "PUBLISHED", "SCHEDULED", "DRAFT", "FAILED"];

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [engagement, setEngagement] = useState<any | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyAccountSelection, setReplyAccountSelection] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [selectedPublishAccounts, setSelectedPublishAccounts] = useState<string[]>([]);
  const [publishingPostId, setPublishingPostId] = useState("");
  const [publishResult, setPublishResult] = useState("");

  useEffect(() => {
    fetchPosts();
    fetchSocialAccounts();
  }, [filter]);

  async function fetchPosts() {
    setLoading(true);
    const res = await fetch(`/api/posts?status=${filter}`);
    const data = await res.json();
    setPosts(data.posts || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function fetchSocialAccounts() {
    const res = await fetch("/api/social-accounts");
    if (!res.ok) return;
    const data = await res.json();
    const active = (Array.isArray(data) ? data : []).filter((x) => x.isActive);
    setSocialAccounts(active);
    if (active.length > 0) {
      setSelectedPublishAccounts((prev) => (prev.length > 0 ? prev : active.map((x) => x.id)));
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    setPosts((p) => p.filter((x) => x.id !== id));
  }

  async function loadEngagement(postId: string) {
    setSelectedPostId(postId);
    const res = await fetch(`/api/posts/${postId}/engagement`);
    const data = await res.json();
    if (res.ok) setEngagement(data);
  }

  async function replyToComment(commentId: string) {
    const message = replyDraft[commentId];
    if (!message?.trim() || !selectedPostId) return;
    
    const selectedAccount = replyAccountSelection[commentId];
    if (!selectedAccount) {
      toast({
        title: "Account required",
        description: "Please select which account to reply from.",
        variant: "destructive",
      });
      return;
    }

    const res = await fetch(`/api/posts/${selectedPostId}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reply",
        commentId,
        message: message.trim(),
        socialAccountId: selectedAccount,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setEngagement(data);
      setReplyDraft((prev) => ({ ...prev, [commentId]: "" }));
      setReplyAccountSelection((prev) => ({ ...prev, [commentId]: "" }));
    } else {
      toast({
        title: "Reply failed",
        description: data.error || "Failed to post reply.",
        variant: "destructive",
      });
    }
  }

  async function analyzeSentiment() {
    if (!selectedPostId) return;
    setAnalyzing(true);
    const res = await fetch(`/api/posts/${selectedPostId}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "analyze" }),
    });
    const data = await res.json();
    if (res.ok) setEngagement(data);
    setAnalyzing(false);
  }

  function togglePublishAccount(id: string) {
    setSelectedPublishAccounts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function publishPost(post: any) {
    if (!post?.id || selectedPublishAccounts.length === 0) return;
    setPublishingPostId(post.id);
    setPublishResult("");
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        content: post.content,
        mediaUrls: post.mediaUrls || [],
        selectedSocialAccountIds: selectedPublishAccounts,
      }),
    });
    const data = await res.json();
    setPublishResult(res.ok ? "Post published to selected social accounts." : data?.error || "Failed to publish post.");
    setPublishingPostId("");
    if (res.ok) await fetchPosts();
  }

  const filtered = search
    ? posts.filter((p) => p.content.toLowerCase().includes(search.toLowerCase()))
    : posts;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{total} total posts</p>
        </div>
        <Link href="/compose">
          <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl font-semibold text-sm flex items-center gap-2">
            <HiPlus className="text-base" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-gray-200 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === s
                    ? "brand-gradient-bg text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-5xl mb-4">📝</p>
            <p className="font-semibold text-gray-600">No posts found</p>
            <p className="text-sm mt-1">Create your first post using the Compose tool</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((post) => (
              <div key={post.id} className="flex items-start gap-4 p-5 hover:bg-gray-50/50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">{post.content}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-gray-400">{formatRelative(post.createdAt)}</span>
                    {post.scheduledAt && (
                      <span className="text-xs text-blue-500">📅 {new Date(post.scheduledAt).toLocaleDateString()}</span>
                    )}
                    {post.status === "PUBLISHED" && (
                      <button
                        onClick={() => loadEngagement(post.id)}
                        className="text-xs text-violet-600 hover:text-violet-700 font-semibold"
                      >
                        View likes/comments
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`${STATUS_COLORS[post.status]} border-0 text-xs font-medium`}>{post.status}</Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="p-1.5 rounded-lg text-violet-500 hover:bg-violet-50 transition-all">
                        <HiEye className="text-sm" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Post Preview</DialogTitle>
                        <DialogDescription>Review the full text and media before publishing.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
                          {Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {post.mediaUrls.map((url: string, idx: number) => {
                                const isVideo = /\.(mp4|mov|webm|ogg)(\?|$)/i.test(url);
                                return isVideo ? (
                                  <video key={`${post.id}-${idx}`} src={url} className="w-full h-20 object-cover rounded-md" controls />
                                ) : (
                                  <img key={`${post.id}-${idx}`} src={url} alt="Post media" className="w-full h-20 object-cover rounded-md" />
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-700">Publish to social accounts</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {socialAccounts.map((account) => (
                              <label key={`${post.id}-${account.id}`} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg p-2">
                                <input
                                  type="checkbox"
                                  checked={selectedPublishAccounts.includes(account.id)}
                                  onChange={() => togglePublishAccount(account.id)}
                                />
                                <span className="truncate">{account.accountName} ({account.platform})</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => publishPost(post)}
                          disabled={publishingPostId === post.id || selectedPublishAccounts.length === 0}
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <HiPaperAirplane className="mr-1" />
                          {publishingPostId === post.id ? "Publishing..." : "Publish now"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {post.status !== "PUBLISHED" && (
                    <button
                      onClick={() => publishPost(post)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all"
                      title="Publish post"
                    >
                      <HiPaperAirplane className="text-sm" />
                    </button>
                  )}
                  <button
                    onClick={() => deletePost(post.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-all"
                  >
                    <HiTrash className="text-sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {engagement && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Published Post Engagement</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">👍 {engagement.likes} likes</span>
              <Button size="sm" variant="outline" onClick={analyzeSentiment} disabled={analyzing}>
                {analyzing ? "Analyzing..." : "AI Analyze Sentiment"}
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {(engagement.comments || []).map((comment: any) => (
              <div key={comment.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">{comment.author}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{comment.sentiment || "unknown"}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{comment.message}</p>
                <div className="mt-2 space-y-1">
                  {(comment.replies || []).map((r: any) => (
                    <p key={r.id} className="text-xs text-gray-600 bg-gray-50 rounded-md px-2 py-1">↳ {r.message}</p>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    placeholder="Reply through the site..."
                    value={replyDraft[comment.id] || ""}
                    onChange={(e) => setReplyDraft((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                  />
                  {socialAccounts.length > 0 && (
                    <select
                      value={replyAccountSelection[comment.id] || ""}
                      onChange={(e) =>
                        setReplyAccountSelection((prev) => ({ ...prev, [comment.id]: e.target.value }))
                      }
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select account...</option>
                      {socialAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName || acc.platform}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button size="sm" onClick={() => replyToComment(comment.id)}>
                    Reply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {publishResult && <p className="text-sm text-gray-600">{publishResult}</p>}
    </div>
  );
}
