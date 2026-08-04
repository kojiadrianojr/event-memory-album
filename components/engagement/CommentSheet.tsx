"use client";

import { Comment } from "@/components/gallery/types";
import BottomSheet from "@/components/ui/BottomSheet";
import {
  CommentForm,
  CommentThread,
  useCommentState,
} from "./CommentPanel";

interface CommentSheetProps {
  open: boolean;
  onClose: () => void;
  token: string;
  postId: string;
  initialComments: Comment[];
  authorName?: string;
  readOnly?: boolean;
  onCommentAdded?: (comment: Comment) => void;
  onCommentUpdated?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export default function CommentSheet({
  open,
  onClose,
  token,
  postId,
  initialComments,
  authorName,
  readOnly = false,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
}: CommentSheetProps) {
  const { comments, submitComment, dropComment } = useCommentState({
    token,
    postId,
    initialComments,
    authorName: authorName ?? "",
    onCommentAdded,
  });

  function handleCommentDeleted(commentId: string) {
    dropComment(commentId);
    onCommentDeleted?.(commentId);
  }

  const title =
    comments.length === 0
      ? "Comments"
      : `Comments · ${comments.length}`;

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <CommentThread
        comments={comments}
        variant="light"
        className="max-h-[50dvh] overflow-y-auto"
        token={token}
        guestName={authorName}
        readOnly={readOnly}
        onCommentUpdated={onCommentUpdated}
        onCommentDeleted={handleCommentDeleted}
      />
      {!readOnly && authorName && (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <CommentForm onSubmit={submitComment} variant="light" />
        </div>
      )}
    </BottomSheet>
  );
}
