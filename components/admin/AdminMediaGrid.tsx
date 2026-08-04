"use client";

import { useState } from "react";
import { mediaFileUrl } from "@/lib/media-url";

interface AdminPostItem {
  id: string;
  caption: string | null;
  uploaderName: string;
  media: {
    id: string;
    url: string | null;
    type: "PHOTO" | "VIDEO" | "TEXT" | "AUDIO";
  }[];
}

interface AdminMediaGridProps {
  items: AdminPostItem[];
  adminToken: string;
}

export default function AdminMediaGrid({
  items,
  adminToken,
}: AdminMediaGridProps) {
  const [posts, setPosts] = useState(items);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (deleting) return;
    if (!confirm("Delete this post and all its photos? This cannot be undone."))
      return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Token": adminToken },
      });
      if (res.ok || res.status === 204) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  }

  if (posts.length === 0) {
    return <p className="text-sm text-zinc-400">No media uploaded yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {posts.map((post) => {
        const cover = post.media[0];
        const extra = post.media.length - 1;

        return (
          <div
            key={post.id}
            className="relative group rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
          >
            {cover?.type === "PHOTO" && cover.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaFileUrl(cover.id, { thumb: true })}
                alt={post.caption ?? `Photo by ${post.uploaderName}`}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
              />
            ) : cover?.type === "TEXT" ? (
              <div className="flex aspect-square w-full items-center justify-center bg-amber-50 p-3">
                <p className="text-xs text-zinc-600 italic line-clamp-4 text-center">
                  {post.caption}
                </p>
              </div>
            ) : cover?.type === "AUDIO" ? (
              <div className="flex aspect-square w-full flex-col items-center justify-center bg-violet-50 p-2">
                <span className="text-2xl">🎙️</span>
                <span className="text-[10px] text-zinc-500 mt-1">Voice</span>
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-zinc-800">
                <svg
                  className="h-8 w-8 text-white opacity-70"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
            {extra > 0 && (
              <span className="absolute bottom-10 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                +{extra}
              </span>
            )}
            <button
              onClick={() => handleDelete(post.id)}
              disabled={deleting === post.id}
              className="absolute top-1.5 right-1.5 rounded-full bg-red-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
              aria-label="Delete"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="px-2 py-1.5">
              <p className="truncate text-xs text-zinc-600">{post.uploaderName}</p>
              {post.caption && cover?.type !== "TEXT" && (
                <p className="truncate text-xs text-zinc-400">{post.caption}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
