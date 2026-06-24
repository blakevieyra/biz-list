"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { commentOnJobApplication } from "@/lib/actions/business";
import type { JobApplicationComment } from "@/lib/types";
import { formatPostDateTime } from "@/components/ui";

export function JobApplicationComments({
  applicationId,
  comments,
  currentUserId,
}: {
  applicationId: string;
  comments: JobApplicationComment[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    startTransition(async () => {
      setError(null);
      const result = await commentOnJobApplication(applicationId, body.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-slate-50/70 p-4">
      <h3 className="text-sm font-semibold">Application discussion</h3>
      <ul className="mt-3 space-y-3">
        {comments.length === 0 && (
          <li className="text-sm text-muted">No comments yet. Ask a question or share an update.</li>
        )}
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{comment.authorName}</span>
              {comment.isOwnerReply && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  Business reply
                </span>
              )}
              <span className="text-xs text-muted">{formatPostDateTime(comment.createdAt)}</span>
            </div>
            <p className="mt-1 text-muted">{comment.body}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Post
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
