"use client";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiSearch, HiPlus, HiTrash, HiPencil, HiFilter } from "react-icons/hi";
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

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  async function fetchPosts() {
    setLoading(true);
    const res = await fetch(`/api/posts?status=${filter}`);
    const data = await res.json();
    setPosts(data.posts || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    setPosts((p) => p.filter((x) => x.id !== id));
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
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`${STATUS_COLORS[post.status]} border-0 text-xs font-medium`}>{post.status}</Badge>
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
    </div>
  );
}
