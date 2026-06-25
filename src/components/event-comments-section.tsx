"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { commentOnEvent } from "@/lib/actions/events";
import { Card, formatPostDateTime } from "@/components/ui";
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
    <Card id="comments" className="scroll-mt-24">
      <h2 className="font-semibold">Comments</h2>
      <p className="mt-1 text-sm text-muted">Ask questions or share feedback about this event.</p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-h-[12rem] flex-col lg:min-h-[16rem]">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Discussion</p>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {comments.length > 0 ? (
              <ul className="space-y-3">
                {comments.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-lg border border-border bg-slate-50/80 px-3 py-2.5"
                  >
                    <p className="text-sm leading-relaxed text-foreground">{comment.body}</p>
                    <p className="mt-2 text-xs text-muted">
                      <span className="font-medium text-foreground">{comment.authorName}</span>
                      <span className="mx-1.5">·</span>
                      <time dateTime={comment.createdAt}>{formatPostDateTime(comment.createdAt)}</time>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No comments yet. Be the first to ask a question.</p>
            )}
          </div>
        </div>

        <div className="min-w-0 lg:border-l lg:border-border lg:pl-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Add a comment</p>
          {currentUserId ? (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <label className="block text-sm">
                Your comment
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={4}
                  placeholder="Ask about parking, timing, accessibility..."
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={pending || !body.trim()}
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? "Posting..." : "Post comment"}
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">
              <a href={`/auth/login?next=${encodeURIComponent(`/events/${eventId}`)}`} className="text-accent hover:underline">
                Sign in
              </a>{" "}
              to join the discussion.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
