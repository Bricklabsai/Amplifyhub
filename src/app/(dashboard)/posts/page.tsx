"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HiSearch, HiPlus, HiTrash, HiEye, HiPaperAirplane } from "react-icons/hi";
import { formatRelative, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { validateAccountsMedia } from "@/lib/media-requirements";
import type { Platform } from "@/generated/client";

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  DRAFT: "bg-gray-100 text-gray-600",
  FAILED: "bg-red-100 text-red-700",
  queued: "bg-amber-100 text-amber-800",
};

const STATUS_FILTERS = ["all", "PUBLISHED", "SCHEDULED", "DRAFT", "queued", "FAILED"];

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  PUBLISHED: "Published",
  SCHEDULED: "Scheduled",
  DRAFT: "Drafts",
  queued: "Queued",
  FAILED: "Failed",
};

function PostsPageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(
    STATUS_FILTERS.includes(initialStatus) ? initialStatus : "all"
  );
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [selectedPublishAccounts, setSelectedPublishAccounts] = useState<string[]>([]);
  const [publishingPostId, setPublishingPostId] = useState("");
  const [publishResult, setPublishResult] = useState("");

  useEffect(() => {
    const status = searchParams.get("status");
    if (status && STATUS_FILTERS.includes(status)) {
      setFilter(status);
    }
  }, [searchParams]);

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

  function togglePublishAccount(id: string) {
    setSelectedPublishAccounts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function publishPost(post: any) {
    if (!post?.id || selectedPublishAccounts.length === 0) return;

    const mediaUrls = post.mediaUrls || [];
    const accountsToPublish = socialAccounts.filter((a) =>
      selectedPublishAccounts.includes(a.id)
    );
    const mediaCheck = validateAccountsMedia(
      accountsToPublish.map((a) => ({ platform: a.platform as Platform })),
      mediaUrls
    );
    if (!mediaCheck.valid) {
      setPublishResult(mediaCheck.errors.join(" "));
      toast({
        title: "Media required",
        description: mediaCheck.errors.join(" "),
        variant: "destructive",
      });
      return;
    }

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
    const results = (data?.results ?? {}) as Record<
      string,
      { success?: boolean; error?: string }
    >;
    const failed = Object.values(results).filter((r) => r && !r.success);
    const succeeded = Object.values(results).filter((r) => r?.success);

    if (res.ok && succeeded.length > 0) {
      setPublishResult(
        failed.length > 0
          ? `Published to ${succeeded.length} account(s). Failed: ${failed.map((r) => r.error).filter(Boolean).join("; ")}`
          : "Post published to selected social accounts."
      );
      await fetchPosts();
    } else {
      setPublishResult(
        data?.error ||
          failed.map((r) => r.error).filter(Boolean).join("; ") ||
          "Failed to publish post."
      );
    }
    setPublishingPostId("");
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
               className="pl-9 h-10 rounded-xl border-gray-200 text-sm text-black"
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
                {STATUS_LABELS[s] ?? s}
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
                      <span className="text-xs text-blue-500">📅 {formatDateTime(post.scheduledAt)}</span>
                    )}
                    {post.status === "PUBLISHED" && (
                      <Link
                        href={`/posts/messages?post=${post.id}`}
                        className="text-xs font-semibold text-[#7331FF] hover:underline"
                      >
                        View engagement →
                      </Link>
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

      {publishResult && <p className="text-sm text-gray-600">{publishResult}</p>}
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-gray-400">Loading posts...</div>
      }
    >
      <PostsPageContent />
    </Suspense>
  );
}
