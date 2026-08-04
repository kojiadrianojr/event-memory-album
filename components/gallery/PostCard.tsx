"use client";

import { useRef, useState } from "react";
import { safeFormatDate } from "@/lib/safe-date";
import { mimeFromUrl } from "@/lib/mime-from-url";
import {
  mediaFileUrl,
  mediaPlaybackUrl,
  mediaPosterUrl,
} from "@/lib/media-url";
import AudioPlayer from "@/components/media/AudioPlayer";
import VideoPlayer from "@/components/media/VideoPlayer";
import PostEngagementRow from "@/components/engagement/PostEngagementRow";
import { CommentOptionsMenu } from "@/components/engagement/CommentPanel";
import GuestAvatar from "@/components/ui/GuestAvatar";
import MediaStackIndicator from "@/components/gallery/MediaStackIndicator";
import {
  PostItem,
  Reaction,
  Comment,
  EventMoment,
  isAudioPost,
  isTextPost,
  isVideoPost,
  isVisualPost,
  primaryMedia,
} from "./types";

function visualMedia(post: PostItem) {
  return post.media.filter((m) => m.type === "PHOTO" || m.type === "VIDEO");
}

function visualMediaLabel(post: PostItem): string {
  const visual = visualMedia(post);
  if (visual.length <= 1) return "";
  const photos = visual.filter((m) => m.type === "PHOTO").length;
  const videos = visual.filter((m) => m.type === "VIDEO").length;
  if (photos > 0 && videos > 0) {
    return ` · ${visual.length} items`;
  }
  if (videos > 0) {
    return ` · ${visual.length} videos`;
  }
  return ` · ${visual.length} photos`;
}

interface PostCardProps {
  post: PostItem;
  token: string;
  guestName: string;
  readOnly?: boolean;
  moments?: EventMoment[];
  onImageClick: (mediaIndex: number) => void;
  onReactionsChange: (reactions: Reaction[]) => void;
  onCommentAdded: (comment: Comment) => void;
  onPostUpdated: (
    postId: string,
    patch: {
      caption: string | null;
      momentId: string | null;
      moment: EventMoment | null;
    }
  ) => void;
  onPostDeleted: (postId: string) => void;
  onCommentUpdated: (postId: string, comment: Comment) => void;
  onCommentDeleted: (postId: string, commentId: string) => void;
}

function MediaTile({
  asset,
  post,
  onClick,
  overlay,
  className = "",
}: {
  asset: PostItem["media"][number];
  post: PostItem;
  onClick: () => void;
  overlay?: string;
  className?: string;
}) {
  if (asset.type === "VIDEO" && asset.url) {
    return (
      <div className={`relative overflow-hidden bg-zinc-900 ${className}`}>
        <VideoPlayer
          src={mediaPlaybackUrl(asset)}
          poster={mediaPosterUrl(asset)}
          mimeType={mimeFromUrl(asset.url, "video", "video/mp4")}
          className="h-full w-full"
          compact
          onExpand={onClick}
        />
        {overlay && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
            {overlay}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative block w-full overflow-hidden bg-zinc-100 focus:outline-none ${className}`}
      aria-label={post.caption ?? `Photo by ${post.uploaderName}`}
    >
      {asset.type === "PHOTO" && asset.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaFileUrl(asset.id, { thumb: true })}
          alt={post.caption ?? `Photo by ${post.uploaderName}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-zinc-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <svg
              className="ml-0.5 h-5 w-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      {overlay && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
          {overlay}
        </span>
      )}
    </button>
  );
}

function MediaGrid({
  post,
  onImageClick,
}: {
  post: PostItem;
  onImageClick: (mediaIndex: number) => void;
}) {
  const visual = post.media.filter((m) => m.type === "PHOTO" || m.type === "VIDEO");
  const count = visual.length;

  const indicator = <MediaStackIndicator count={count} />;

  if (count === 1) {
    const asset = visual[0];
    return (
      <MediaTile
        asset={asset}
        post={post}
        onClick={() => onImageClick(post.media.indexOf(asset))}
        className="w-full"
      />
    );
  }

  if (count === 2) {
    return (
      <div className="relative grid grid-cols-2 gap-0.5">
        {indicator}
        {visual.map((asset) => (
          <MediaTile
            key={asset.id}
            asset={asset}
            post={post}
            onClick={() => onImageClick(post.media.indexOf(asset))}
            className="aspect-square"
          />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="relative grid grid-cols-2 gap-0.5">
        {indicator}
        <MediaTile
          asset={visual[0]}
          post={post}
          onClick={() => onImageClick(post.media.indexOf(visual[0]))}
          className="col-span-2 aspect-[2/1]"
        />
        {visual.slice(1).map((asset) => (
          <MediaTile
            key={asset.id}
            asset={asset}
            post={post}
            onClick={() => onImageClick(post.media.indexOf(asset))}
            className="aspect-square"
          />
        ))}
      </div>
    );
  }

  const shown = visual.slice(0, 4);
  const extra = count - 4;

  return (
    <div className="relative grid grid-cols-2 gap-0.5">
      {indicator}
      {shown.map((asset, i) => (
        <MediaTile
          key={asset.id}
          asset={asset}
          post={post}
          onClick={() => onImageClick(post.media.indexOf(asset))}
          className="aspect-square"
          overlay={i === 3 && extra > 0 ? `+${extra}` : undefined}
        />
      ))}
    </div>
  );
}

export default function PostCard({
  post,
  token,
  guestName,
  readOnly = false,
  moments = [],
  onImageClick,
  onReactionsChange,
  onCommentAdded,
  onPostUpdated,
  onPostDeleted,
  onCommentUpdated,
  onCommentDeleted,
}: PostCardProps) {
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption ?? "");
  const [editMomentId, setEditMomentId] = useState(post.momentId ?? "");
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [commentActionLoading, setCommentActionLoading] = useState<
    string | null
  >(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const isOwner = !readOnly && post.uploaderName === guestName;

  const date = post.takenAt ?? post.uploadedAt;
  const asset = primaryMedia(post);

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const content = commentInput.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          postId: post.id,
          content,
          authorName: guestName,
        }),
      });
      if (!res.ok) return;
      const comment: Comment = await res.json();
      onCommentAdded(comment);
      setCommentInput("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePostEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (editSaving) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          uploaderName: guestName,
          caption: editCaption,
          momentId: editMomentId || null,
        }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      onPostUpdated(post.id, {
        caption: updated.caption,
        momentId: updated.momentId,
        moment: updated.moment ?? null,
      });
      setEditing(false);
      setMenuOpen(false);
    } finally {
      setEditSaving(false);
    }
  }

  async function handlePostDelete() {
    if (deleting) return;
    if (
      !confirm("Delete this post? This cannot be undone.")
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, uploaderName: guestName }),
      });
      if (res.ok || res.status === 204) {
        onPostDeleted(post.id);
      }
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  }

  function startEditComment(comment: Comment) {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
    setOpenCommentMenuId(null);
  }

  async function handleCommentEditSave(commentId: string) {
    const content = editCommentContent.trim();
    if (!content || commentActionLoading) return;
    setCommentActionLoading(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          authorName: guestName,
          content,
        }),
      });
      if (!res.ok) return;
      const updated: Comment = await res.json();
      onCommentUpdated(post.id, updated);
      setEditingCommentId(null);
      setEditCommentContent("");
      setOpenCommentMenuId(null);
    } finally {
      setCommentActionLoading(null);
    }
  }

  async function handleCommentDelete(commentId: string) {
    if (commentActionLoading) return;
    if (!confirm("Delete this comment?")) return;
    setCommentActionLoading(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, authorName: guestName }),
      });
      if (res.ok || res.status === 204) {
        onCommentDeleted(post.id, commentId);
        setOpenCommentMenuId(null);
      }
    } finally {
      setCommentActionLoading(null);
    }
  }

  const PREVIEW_COUNT = 2;
  const visibleComments = showAllComments
    ? post.comments
    : post.comments.slice(-PREVIEW_COUNT);
  const hiddenCount = post.comments.length - PREVIEW_COUNT;

  return (
    <article className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <GuestAvatar name={post.uploaderName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">
            {post.uploaderName}
          </p>
          <p className="text-[11px] text-zinc-400 leading-tight">
            {safeFormatDate(date, "MMM d 'at' h:mm a")}
            {post.moment ? ` · ${post.moment.name}` : ""}
            {visualMediaLabel(post)}
          </p>
        </div>
        {isVisualPost(post) && (
          <button
            onClick={() => onImageClick(0)}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg transition-colors"
            aria-label="View fullscreen"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
              />
            </svg>
          </button>
        )}
        {isOwner && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg transition-colors"
              aria-label="Post options"
            >
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setEditCaption(post.caption ?? "");
                      setEditMomentId(post.momentId ?? "");
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handlePostDelete}
                    disabled={deleting}
                    className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {editing && (
        <form
          onSubmit={handlePostEditSave}
          className="border-b border-zinc-100 px-4 py-3 flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Caption</span>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              maxLength={500}
              rows={isTextPost(post) ? 3 : 2}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300 resize-none"
              placeholder={isTextPost(post) ? "Your memory…" : "Add a caption…"}
            />
          </label>
          {moments.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Moment</span>
              <select
                value={editMomentId}
                onChange={(e) => setEditMomentId(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              >
                <option value="">No moment</option>
                {moments.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              {editSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {post.prompt && (
        <div className="px-4 pb-2">
          <span className="inline-block rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
            {post.prompt.text}
          </span>
        </div>
      )}

      {isTextPost(post) ? (
        <div className="px-4 pb-4">
          <blockquote className="border-l-4 border-zinc-300 pl-4 text-sm text-zinc-700 leading-relaxed italic">
            {post.caption}
          </blockquote>
        </div>
      ) : isAudioPost(post) && asset ? (
        <div className="px-4 pb-4">
          <AudioPlayer src={mediaFileUrl(asset.id)} className="w-full" />
          {post.caption && (
            <p className="mt-2 text-sm text-zinc-600">{post.caption}</p>
          )}
        </div>
      ) : isVideoPost(post) && asset ? (
        <div className="bg-black">
          <VideoPlayer
            src={mediaPlaybackUrl(asset)}
            poster={mediaPosterUrl(asset)}
            mimeType={mimeFromUrl(asset.url!, "video", "video/mp4")}
            className="w-full"
            onExpand={() => onImageClick(0)}
          />
        </div>
      ) : (
        <MediaGrid post={post} onImageClick={onImageClick} />
      )}

      {(readOnly || guestName) && (
        <div className="px-3 pt-2.5 pb-1">
          <PostEngagementRow
            token={token}
            postId={post.id}
            reactions={post.reactions}
            guestName={readOnly ? "" : guestName}
            onReactionsChange={onReactionsChange}
            readOnly={readOnly}
            onCommentClick={
              readOnly
                ? undefined
                : () => {
                    commentInputRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                    });
                    commentInputRef.current?.focus();
                  }
            }
          />
        </div>
      )}

      {post.caption && !isTextPost(post) && (
        <div className="px-4 pb-1">
          <p className="text-sm text-zinc-800 leading-snug">
            <span className="font-semibold">{post.uploaderName}</span>{" "}
            {post.caption}
          </p>
        </div>
      )}

      {post.comments.length > 0 && (
        <div className="px-4 pt-1 pb-1.5 flex flex-col gap-1">
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowAllComments((expanded) => !expanded);
                setOpenCommentMenuId(null);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600 text-left w-fit"
            >
              {showAllComments
                ? "Show fewer comments"
                : `View all ${post.comments.length} comments`}
            </button>
          )}
          {visibleComments.map((c) => (
            <div key={c.id} className="group flex items-start gap-1">
              <div className="min-w-0 flex-1">
                {editingCommentId === c.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCommentEditSave(c.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      maxLength={1000}
                      className="flex-1 min-w-0 rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={commentActionLoading === c.id}
                      className="text-xs font-semibold text-zinc-900 disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCommentId(null)}
                      className="text-xs text-zinc-400"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-zinc-700 leading-snug">
                    <span className="font-semibold text-zinc-900">
                      {c.authorName}
                    </span>{" "}
                    {c.content}
                  </p>
                )}
              </div>
              {!readOnly &&
                c.authorName === guestName &&
                editingCommentId !== c.id && (
                  <CommentOptionsMenu
                    open={openCommentMenuId === c.id}
                    actionLoading={commentActionLoading === c.id}
                    onToggle={() =>
                      setOpenCommentMenuId((current) =>
                        current === c.id ? null : c.id
                      )
                    }
                    onClose={() => setOpenCommentMenuId(null)}
                    onEdit={() => startEditComment(c)}
                    onDelete={() => handleCommentDelete(c.id)}
                  />
                )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="border-t border-zinc-100 px-4 py-2.5">
          <form
            onSubmit={handleCommentSubmit}
            className="flex items-center gap-2.5"
          >
            <GuestAvatar name={guestName} size="sm" />
            <input
              ref={commentInputRef}
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add a comment…"
              maxLength={1000}
              className="flex-1 min-w-0 text-sm text-zinc-800 placeholder-zinc-400 bg-transparent focus:outline-none"
            />
            {commentInput.trim() && (
              <button
                type="submit"
                disabled={submitting}
                className="shrink-0 text-xs font-semibold text-zinc-900 hover:text-zinc-500 disabled:opacity-40 transition-colors"
              >
                {submitting ? "…" : "Post"}
              </button>
            )}
          </form>
        </div>
      )}
    </article>
  );
}
