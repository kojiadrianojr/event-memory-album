"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Comment, PostItem, Reaction } from "@/components/gallery/types";
import GuestAvatar from "@/components/ui/GuestAvatar";
import { safeFormatDate } from "@/lib/safe-date";
import ReactionBar from "./ReactionBar";
import PostEngagementRow from "./PostEngagementRow";
import {
  CommentForm,
  CommentThread,
  useCommentState,
} from "./CommentPanel";
import CommentSheet from "./CommentSheet";

interface LightboxEngagementProps {
  post: PostItem;
  token: string;
  guestName: string;
  readOnly?: boolean;
  isMobile: boolean;
  onReactionsChange: (reactions: Reaction[]) => void;
  onCommentAdded: (comment: Comment) => void;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
}

function commentSummary(count: number): string {
  if (count === 0) return "Add a comment";
  if (count === 1) return "1 comment";
  return `${count} comments`;
}

function postDateLabel(post: PostItem): string {
  const date = post.uploadedAt;
  if (!date) return "";
  return safeFormatDate(date, "MMM d, yyyy");
}

export default function LightboxEngagement({
  post,
  token,
  guestName,
  readOnly = false,
  isMobile,
  onReactionsChange,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
}: LightboxEngagementProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const commentsScrollRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const prevCommentCountRef = useRef(0);
  const commentCount = post.comments.length;
  const canComment = !readOnly && !!guestName;
  const useCommentSheet = isMobile;
  const showCommentTextTrigger =
    useCommentSheet && (canComment || commentCount > 0);
  const showCommentIcon = !isMobile && canComment;
  const dateLabel = postDateLabel(post);

  const { comments, submitComment, dropComment } = useCommentState({
    token,
    postId: post.id,
    initialComments: post.comments,
    authorName: guestName,
    onCommentAdded,
  });

  function handleCommentDeleted(commentId: string) {
    dropComment(commentId);
    onCommentDeleted(commentId);
  }

  useLayoutEffect(() => {
    if (isMobile || comments.length === 0) return;
    commentsEndRef.current?.scrollIntoView({ block: "end" });
    prevCommentCountRef.current = comments.length;
  }, [isMobile, post.id]);

  useEffect(() => {
    if (isMobile || comments.length <= prevCommentCountRef.current) {
      prevCommentCountRef.current = comments.length;
      return;
    }

    commentsEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
    prevCommentCountRef.current = comments.length;
  }, [comments.length, isMobile]);

  function openComments(event: React.MouseEvent) {
    event.stopPropagation();
    setCommentsOpen(true);
  }

  function focusComments() {
    if (useCommentSheet) {
      setCommentsOpen(true);
      return;
    }
    commentsScrollRef.current?.scrollTo({
      top: commentsScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
    commentInputRef.current?.focus();
  }

  if (!isMobile) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-zinc-800 px-3 py-2">
          <div className="flex items-center gap-2">
            <GuestAvatar name={post.uploaderName} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {post.uploaderName}
              </p>
              {dateLabel && (
                <p className="text-[10px] text-zinc-500">{dateLabel}</p>
              )}
            </div>
          </div>
          {post.caption && (
            <p className="mt-1.5 text-xs leading-snug text-zinc-300">
              {post.caption}
            </p>
          )}
        </div>

        <div
          ref={commentsScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2"
        >
          {comments.length > 0 && (
            <div className="sticky top-0 z-10 -mx-3 mb-1 border-b border-zinc-800/80 bg-zinc-950/95 px-3 py-1 backdrop-blur-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {comments.length} comment{comments.length === 1 ? "" : "s"}
              </p>
            </div>
          )}

          <CommentThread
            comments={comments}
            variant="dark"
            token={token}
            guestName={guestName}
            readOnly={readOnly}
            onCommentUpdated={onCommentUpdated}
            onCommentDeleted={handleCommentDeleted}
            emptyLabel="No comments yet."
          />
          <div ref={commentsEndRef} aria-hidden="true" className="h-px shrink-0" />
        </div>

        <div className="shrink-0 border-t border-zinc-800 px-3 py-2">
          <PostEngagementRow
            variant="dark"
            pickerPlacement="below"
            token={token}
            postId={post.id}
            reactions={post.reactions}
            guestName={guestName}
            onReactionsChange={onReactionsChange}
            readOnly={readOnly}
            onCommentClick={showCommentIcon ? focusComments : undefined}
          />
          {canComment && (
            <div className="mt-2">
              <CommentForm
                onSubmit={submitComment}
                variant="dark"
                inputRef={commentInputRef}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {post.caption && (
        <p className="line-clamp-3 break-words text-sm leading-snug text-zinc-200">
          <span className="font-semibold text-white">{post.uploaderName}</span>{" "}
          {post.caption}
        </p>
      )}

      <ReactionBar
        variant="dark"
        layout="feed"
        compact
        token={token}
        postId={post.id}
        reactions={post.reactions}
        guestName={guestName}
        onReactionsChange={onReactionsChange}
        readOnly={readOnly}
      />

      {showCommentTextTrigger && (
        <button
          type="button"
          onClick={openComments}
          className="w-fit max-w-full truncate text-left text-xs font-medium text-zinc-300 hover:text-white touch-manipulation"
          aria-label={
            commentCount > 0
              ? `View ${commentCount} comments`
              : "Add a comment"
          }
        >
          {commentSummary(commentCount)}
        </button>
      )}

      {useCommentSheet && (
        <CommentSheet
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          token={token}
          postId={post.id}
          initialComments={post.comments}
          authorName={canComment ? guestName : undefined}
          readOnly={readOnly}
          onCommentAdded={onCommentAdded}
          onCommentUpdated={onCommentUpdated}
          onCommentDeleted={handleCommentDeleted}
        />
      )}
    </div>
  );
}
