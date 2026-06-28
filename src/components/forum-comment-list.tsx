"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteForumComment, editForumComment } from "@/lib/actions/social";
import { formatDate } from "@/components/ui";
import type { Comment } from "@/lib/types";

export function ForumCommentList({
  comments,
  currentUserId,
}: {
  comments: Comment[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [actionPending, startAction] = useTransition();

  function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    startAction(async () => {
      await deleteForumComment(commentId);
      router.refresh();
    });
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditBody(comment.body);
  }

  function handleEditSave(e: React.FormEvent, commentId: string) {
    e.preventDefault();
    startAction(async () => {
      await editForumComment(commentId, editBody);
      setEditingId(null);
      router.refresh();
    });
  }

  if (comments.length === 0) {
    return <p className="mt-4 text-sm text-muted">No comments yet.</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {comments.map((comment) => {
        const isOwn = currentUserId === comment.authorId;
        return (
          <div key={comment.id} className="rounded-lg border border-border bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{comment.authorName}</p>
              <div className="flex items-center gap-3">
                {isOwn && editingId !== comment.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(comment)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      disabled={actionPending}
                      className="text-xs text-muted hover:text-red-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                )}
                <span className="text-xs text-muted">{formatDate(comment.createdAt)}</span>
              </div>
            </div>
            {editingId === comment.id ? (
              <form onSubmit={(e) => handleEditSave(e, comment.id)} className="mt-2 flex gap-2">
                <input
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1 text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={actionPending}
                  className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-muted hover:underline"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <p className="mt-1 text-sm text-muted">{comment.body}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
