"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiArrowLeft, HiHeart, HiLockClosed } from "react-icons/hi";
import { PostEngagementPanel } from "@/components/messages/PostEngagementPanel";
import { Button } from "@/components/ui/button";

type PublishedPost = {
  id: string;
  content: string;
  publishedAt?: string;
  platformPosts?: { likes: number; comments: number; shares: number }[];
};

export default function EngagementsPage() {
  const router = useRouter();
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [dashRes, postsRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/posts?status=PUBLISHED"),
      ]);
      const dash = await dashRes.json();
      setIsPaid(dash.subscription?.isPaid ?? false);

      const postsData = await postsRes.json();
      const list = (postsData.posts || []) as PublishedPost[];
      setPosts(list);
      if (list.length > 0) setSelectedPostId(list[0].id);
      setLoading(false);
    })();
  }, []);

  if (loading || isPaid === null) {
    return (
      <div className="max-w-5xl space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-96 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <HiLockClosed className="mx-auto mb-4 text-5xl text-gray-300" />
        <h2
          className="text-xl font-bold text-gray-900"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Advanced engagement features
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Upgrade to Pro or Corporate to access comment replies, sentiment analysis, and
          per-post engagement insights.
        </p>
        <Button className="mt-6" onClick={() => router.push("/billing")}>
          View plans
        </Button>
        <Link
          href="/dashboard"
          className="mt-4 block text-sm text-violet-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const selected = posts.find((p) => p.id === selectedPostId);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <HiArrowLeft className="text-lg" />
        </Link>
        <div>
          <h2
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Engagements
          </h2>
          <p className="text-sm text-gray-500">
            Likes, comments, shares, and replies across published posts
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-50 px-4 py-3">
            <h3 className="text-sm font-bold text-gray-900">Published posts</h3>
          </div>
          <ul className="max-h-[480px] divide-y divide-gray-50 overflow-y-auto">
            {posts.length === 0 ? (
              <li className="p-6 text-center text-sm text-gray-400">No published posts</li>
            ) : (
              posts.map((post) => {
                const likes = post.platformPosts?.reduce((s, p) => s + p.likes, 0) ?? 0;
                const comments =
                  post.platformPosts?.reduce((s, p) => s + p.comments, 0) ?? 0;
                return (
                  <li key={post.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPostId(post.id)}
                      className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${
                        selectedPostId === post.id ? "bg-violet-50/50" : ""
                      }`}
                    >
                      <p className="line-clamp-2 text-sm text-gray-800">{post.content}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                        <HiHeart className="text-rose-400" />
                        {likes} · {comments} comments
                      </p>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="min-h-[400px] rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {selectedPostId && selected ? (
            <PostEngagementPanel
              postId={selectedPostId}
              postPreview={selected.content}
            />
          ) : (
            <p className="py-12 text-center text-sm text-gray-400">
              Select a post to view engagement
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
