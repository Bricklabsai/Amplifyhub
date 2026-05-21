"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HiArrowLeft, HiCheck, HiTrash, HiEye } from "react-icons/hi";

type MediaItem = {
  id: string;
  url: string;
  type: string;
  filename: string;
  isAI: boolean;
};

export default function MediaLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    void loadMedia();
  }, []);

  async function loadMedia() {
    setLoading(true);
    const res = await fetch("/api/media");
    const data = await res.json();
    setMedia(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function deleteMedia(id: string) {
    if (!confirm("Delete this media item?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMedia((prev) => prev.filter((m) => m.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
    setDeletingId("");
  }

  function useInCompose() {
    sessionStorage.setItem("compose-selected-media-ids", JSON.stringify(selectedIds));
    router.push("/compose");
  }

  const filtered = useMemo(
    () => media.filter((item) => item.filename.toLowerCase().includes(search.toLowerCase())),
    [media, search]
  );

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/compose">
            <Button variant="outline" className="rounded-xl">
              <HiArrowLeft className="mr-1" />
              Back to Compose
            </Button>
          </Link>
          <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "Outfit, sans-serif" }}>
            Media Library
          </h2>
        </div>
        {from === "compose" && (
          <Button onClick={useInCompose} disabled={selectedIds.length === 0} className="brand-gradient-bg text-white border-0">
            <HiCheck className="mr-1" />
            Use {selectedIds.length} item(s) in Compose
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search uploaded and AI Studio images/videos..."
           className="max-w-md text-black"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {loading ? (
          <p className="text-sm text-gray-500">Loading media...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No media found yet. Upload from compose or generate in AI Studio.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleSelection(item.id)}
                className={`relative rounded-lg border overflow-hidden text-left ${
                  selectedIds.includes(item.id) ? "border-violet-500 ring-2 ring-violet-200" : "border-gray-200"
                }`}
              >
                {item.type === "video" ? (
                  <video src={item.url} className="h-28 w-full object-cover" />
                ) : (
                  <img src={item.url} alt={item.filename} className="h-28 w-full object-cover" />
                )}
                <div className="text-[10px] p-1.5 bg-white truncate">
                  {item.isAI ? "AI Studio" : "Upload"} - {item.filename}
                </div>
                <div className="flex items-center gap-1 p-1.5 bg-white border-t border-gray-100">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-gray-200 hover:bg-gray-50"
                      >
                        <HiEye />
                        Preview
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>{item.filename}</DialogTitle>
                      </DialogHeader>
                      <div className="rounded-lg overflow-hidden border border-gray-100">
                        {item.type === "video" ? (
                          <video src={item.url} controls className="w-full max-h-[70vh] bg-black" />
                        ) : (
                          <img src={item.url} alt={item.filename} className="w-full max-h-[70vh] object-contain bg-black/5" />
                        )}
                      </div>
                      <DialogFooter>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-600 hover:text-violet-700">
                          Open original
                        </a>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteMedia(item.id);
                    }}
                    disabled={deletingId === item.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <HiTrash />
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

