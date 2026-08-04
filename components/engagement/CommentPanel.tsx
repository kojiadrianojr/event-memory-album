"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  format,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";
import { Comment } from "@/components/gallery/types";
import GuestAvatar from "@/components/ui/GuestAvatar";

function formatCommentTimestamp(createdAt: string): string {
  const date = parseISO(createdAt);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "MMM d");
  }
  return format(date, "MMM d, yy");
}

function formatCommentDayLabel(createdAt: string): string {
  const date = parseISO(createdAt);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "MMM d");
  }
  return format(date, "MMM d, yyyy");
}

interface CommentDayGroup {
  label: string;
  comments: Comment[];
}

function groupCommentsByDay(comments: Comment[]): CommentDayGroup[] {
  const groups: CommentDayGroup[] = [];

  for (const comment of comments) {
    const label = formatCommentDayLabel(comment.createdAt);
    const last = groups.at(-1);
    if (last?.label === label) {
      last.comments.push(comment);
      continue;
    }
    groups.push({ label, comments: [comment] });
  }

  return groups;
}

export type CommentPanelVariant = "dark" | "light";
export type CommentListLayout = "stacked" | "inline";

function CommentOptionsIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

interface CommentOptionsMenuProps {
  variant?: CommentPanelVariant;
  open: boolean;
  actionLoading?: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function CommentOptionsMenu({
  variant = "light",
  open,
  actionLoading = false,
  onToggle,
  onClose,
  onEdit,
  onDelete,
  className = "",
}: CommentOptionsMenuProps) {
  const isDark = variant === "dark";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuCoords, setMenuCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setMenuCoords(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuWidth = menu?.offsetWidth ?? 88;
      const menuHeight = menu?.offsetHeight ?? 62;
      const gap = 4;
      const viewportPadding = 8;

      let top = rect.bottom + gap;
      let left = rect.right - menuWidth;

      if (top + menuHeight > window.innerHeight - viewportPadding) {
        top = rect.top - menuHeight - gap;
      }

      left = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - menuWidth - viewportPadding)
      );
      top = Math.max(
        viewportPadding,
        Math.min(top, window.innerHeight - menuHeight - viewportPadding)
      );

      setMenuCoords({ top, left });
    };

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const menuPanelClass = useMemo(
    () =>
      `fixed z-[10001] min-w-[88px] rounded-md border py-0.5 shadow-lg ${
        isDark
          ? "border-zinc-700 bg-zinc-900"
          : "border-zinc-200 bg-white"
      }`,
    [isDark]
  );

  return (
    <div className={`relative shrink-0 self-start ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className={`rounded p-0.5 transition-colors ${
          isDark
            ? "text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        } ${open ? "opacity-100" : "opacity-60 group-hover:opacity-100 focus:opacity-100"}`}
        aria-label="Comment options"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <CommentOptionsIcon />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[10000] cursor-default"
              aria-label="Close menu"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
            />
            <div
              ref={menuRef}
              role="menu"
              style={
                menuCoords
                  ? { top: menuCoords.top, left: menuCoords.left }
                  : { top: -9999, left: -9999 }
              }
              className={menuPanelClass}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                className={`block w-full px-2.5 py-1.5 text-left text-xs ${
                  isDark
                    ? "text-zinc-200 hover:bg-zinc-800"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                disabled={actionLoading}
                className={`block w-full px-2.5 py-1.5 text-left text-xs disabled:opacity-40 ${
                  isDark
                    ? "text-red-400 hover:bg-zinc-800"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                Delete
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

interface CommentThreadItemProps {
  comment: Comment;
  variant: CommentPanelVariant;
  guestName: string;
  canManage: boolean;
  isEditing: boolean;
  editContent: string;
  actionLoading: boolean;
  menuOpen: boolean;
  onEditContentChange: (value: string) => void;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

function CommentThreadItem({
  comment,
  variant,
  canManage,
  isEditing,
  editContent,
  actionLoading,
  menuOpen,
  onEditContentChange,
  onMenuToggle,
  onMenuClose,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: CommentThreadItemProps) {
  const isDark = variant === "dark";

  return (
    <li className="group flex gap-1.5 py-1">
      <GuestAvatar name={comment.authorName} size="xs" />
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSaveEdit();
            }}
            className="flex items-center gap-1.5"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="text"
              value={editContent}
              onChange={(event) => onEditContentChange(event.target.value)}
              maxLength={1000}
              autoFocus
              className={
                isDark
                  ? "min-w-0 flex-1 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                  : "min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-0.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              }
            />
            <button
              type="submit"
              disabled={actionLoading || !editContent.trim()}
              className={`shrink-0 text-[11px] font-semibold disabled:opacity-40 ${
                isDark ? "text-zinc-200" : "text-zinc-900"
              }`}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="shrink-0 text-[11px] text-zinc-500"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <p className="text-[11px] leading-snug">
              <span
                className={`font-semibold ${isDark ? "text-zinc-200" : "text-zinc-900"}`}
              >
                {comment.authorName}
              </span>
              <span className="text-zinc-600">
                {" · "}
                <time
                  dateTime={comment.createdAt}
                  title={format(parseISO(comment.createdAt), "PPpp")}
                >
                  {formatCommentTimestamp(comment.createdAt)}
                </time>
              </span>
            </p>
            <p
              className={`break-words text-xs leading-snug ${isDark ? "text-zinc-400" : "text-zinc-600"}`}
            >
              {comment.content}
            </p>
          </>
        )}
      </div>

      {canManage && !isEditing && (
        <CommentOptionsMenu
          variant={variant}
          open={menuOpen}
          actionLoading={actionLoading}
          onToggle={onMenuToggle}
          onClose={onMenuClose}
          onEdit={onStartEdit}
          onDelete={onDelete}
        />
      )}
    </li>
  );
}

interface CommentThreadProps {
  comments: Comment[];
  variant?: CommentPanelVariant;
  emptyLabel?: string;
  className?: string;
  token?: string;
  guestName?: string;
  readOnly?: boolean;
  onCommentUpdated?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export function CommentThread({
  comments,
  variant = "dark",
  emptyLabel = "No comments yet.",
  className = "",
  token,
  guestName = "",
  readOnly = false,
  onCommentUpdated,
  onCommentDeleted,
}: CommentThreadProps) {
  const isDark = variant === "dark";
  const dayGroups = useMemo(() => groupCommentsByDay(comments), [comments]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const canManageComments =
    !readOnly && !!guestName && !!token && !!onCommentUpdated && !!onCommentDeleted;

  async function handleSaveEdit(commentId: string) {
    if (!token || !guestName || !onCommentUpdated) return;
    const content = editContent.trim();
    if (!content || actionLoadingId) return;

    setActionLoadingId(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, authorName: guestName, content }),
      });
      if (!res.ok) return;
      const updated: Comment = await res.json();
      onCommentUpdated(updated);
      setEditingCommentId(null);
      setEditContent("");
      setOpenMenuId(null);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(commentId: string) {
    if (!token || !guestName || !onCommentDeleted) return;
    if (actionLoadingId) return;
    if (!confirm("Delete this comment?")) return;

    setActionLoadingId(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, authorName: guestName }),
      });
      if (res.ok || res.status === 204) {
        onCommentDeleted(commentId);
        setOpenMenuId(null);
        if (editingCommentId === commentId) {
          setEditingCommentId(null);
          setEditContent("");
        }
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  if (comments.length === 0) {
    return (
      <p
        className={`text-xs italic ${isDark ? "text-zinc-400" : "text-zinc-500"} ${className}`}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {dayGroups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <p
            className={`pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide first:pt-0 ${
              isDark ? "text-zinc-600" : "text-zinc-400"
            }`}
          >
            {group.label}
          </p>

          <ul className="flex flex-col">
            {group.comments.map((comment) => (
              <CommentThreadItem
                key={comment.id}
                comment={comment}
                variant={variant}
                guestName={guestName}
                canManage={
                  canManageComments &&
                  comment.authorName === guestName
                }
                isEditing={editingCommentId === comment.id}
                editContent={editContent}
                actionLoading={actionLoadingId === comment.id}
                menuOpen={openMenuId === comment.id}
                onEditContentChange={setEditContent}
                onMenuToggle={() =>
                  setOpenMenuId((current) =>
                    current === comment.id ? null : comment.id
                  )
                }
                onMenuClose={() => setOpenMenuId(null)}
                onStartEdit={() => {
                  setEditingCommentId(comment.id);
                  setEditContent(comment.content);
                  setOpenMenuId(null);
                }}
                onCancelEdit={() => {
                  setEditingCommentId(null);
                  setEditContent("");
                }}
                onSaveEdit={() => handleSaveEdit(comment.id)}
                onDelete={() => handleDelete(comment.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface CommentListProps {
  comments: Comment[];
  variant?: CommentPanelVariant;
  layout?: CommentListLayout;
  emptyLabel?: string;
  className?: string;
}

export function CommentList({
  comments,
  variant = "dark",
  layout = "stacked",
  emptyLabel = "No comments yet.",
  className = "",
}: CommentListProps) {
  const isDark = variant === "dark";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {comments.length === 0 && (
        <p
          className={`text-xs italic ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
        >
          {emptyLabel}
        </p>
      )}
      {comments.map((c) =>
        layout === "inline" ? (
          <p
            key={c.id}
            className={`text-sm leading-snug ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
          >
            <span
              className={`font-semibold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
            >
              {c.authorName}
            </span>{" "}
            {c.content}
          </p>
        ) : (
          <div key={c.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xs font-semibold ${isDark ? "text-zinc-200" : "text-zinc-900"}`}
              >
                {c.authorName}
              </span>
              <span className="text-[10px] text-zinc-500">
                {format(parseISO(c.createdAt), "MMM d, h:mm a")}
              </span>
            </div>
            <p
              className={`text-xs leading-snug ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
            >
              {c.content}
            </p>
          </div>
        )
      )}
    </div>
  );
}

interface CommentFormProps {
  onSubmit: (content: string) => Promise<boolean>;
  variant?: CommentPanelVariant;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function CommentForm({
  onSubmit,
  variant = "dark",
  placeholder = "Add a comment…",
  inputRef,
}: CommentFormProps) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isDark = variant === "dark";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      const ok = await onSubmit(content);
      if (ok) setInput("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        maxLength={1000}
        className={
          isDark
            ? "flex-1 rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            : "flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
        }
      />
      <button
        type="submit"
        disabled={!input.trim() || submitting}
        className={
          isDark
            ? "rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-40"
            : "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        }
      >
        Post
      </button>
    </form>
  );
}

interface UseCommentStateOptions {
  token: string;
  postId: string;
  initialComments: Comment[];
  authorName: string;
  onCommentAdded?: (comment: Comment) => void;
}

export function useCommentState({
  token,
  postId,
  initialComments,
  authorName,
  onCommentAdded,
}: UseCommentStateOptions) {
  const [addedComments, setAddedComments] = useState<Comment[]>([]);

  const comments = useMemo(() => {
    const initialIds = new Set(initialComments.map((comment) => comment.id));
    const pending = addedComments.filter((comment) => !initialIds.has(comment.id));
    return [...initialComments, ...pending];
  }, [initialComments, addedComments]);

  async function submitComment(content: string): Promise<boolean> {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, postId, content, authorName }),
    });
    if (!res.ok) return false;
    const comment: Comment = await res.json();
    setAddedComments((prev) => [...prev, comment]);
    onCommentAdded?.(comment);
    return true;
  }

  function dropComment(commentId: string) {
    setAddedComments((prev) => prev.filter((comment) => comment.id !== commentId));
  }

  return { comments, submitComment, dropComment };
}

interface CommentPanelProps {
  token: string;
  postId: string;
  initialComments: Comment[];
  authorName: string;
  onCommentAdded?: (comment: Comment) => void;
  variant?: CommentPanelVariant;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function CommentPanel({
  token,
  postId,
  initialComments,
  authorName,
  onCommentAdded,
  variant = "dark",
  inputRef,
}: CommentPanelProps) {
  const { comments, submitComment } = useCommentState({
    token,
    postId,
    initialComments,
    authorName,
    onCommentAdded,
  });

  return (
    <div className="flex flex-col gap-3">
      <CommentList
        comments={comments}
        variant={variant}
        className="max-h-48 overflow-y-auto"
      />
      <CommentForm onSubmit={submitComment} variant={variant} inputRef={inputRef} />
    </div>
  );
}
