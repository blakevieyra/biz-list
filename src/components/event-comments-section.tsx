"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { commentOnEvent } from "@/lib/actions/events";
import { formatPostDateTime } from "@/components/ui";
import type { EventComment } from "@/lib/types";

export function EventCommentsSection({
  eventId,
  comments,
  currentUserId,
}: {
  eventId: string;
  comments: EventComment[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await commentOnEvent(eventId, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="mt-6 border-t border-border pt-6">
      <h2 className="font-semibold">Comments</h2>
      <p className="mt-1 text-sm text-muted">Ask questions or share feedback about this event.</p>

      {comments.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-border bg-slate-50/80 px-3 py-2.5">
              <p className="text-sm leading-relaxed">
                <span className="font-medium">{comment.authorName}</span>
                <span className="text-xs text-muted"> · {formatPostDateTime(comment.createdAt)}</span>
              </p>
              <p className="mt-1 text-sm text-muted">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No comments yet. Be the first to ask a question.</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={currentUserId ? "Add a comment..." : "Sign in to comment"}
          className="min-h-11 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Posting..." : "Comment"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
