"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CollaborationInterestedButton } from "@/components/collaboration-interested-button";
import { commentOnCollaboration } from "@/lib/actions/social";
import type { CollaborationComment, CollaborationIdea } from "@/lib/types";
import { Card, formatPostDateTime } from "@/components/ui";

const statusStyles = {
  open: "bg-emerald-100 text-emerald-800",
  in_discussion: "bg-amber-100 text-amber-800",
  closed: "bg-slate-100 text-slate-600",
};

const typeLabels = {
  proposal: "Proposal",
  contract: "Contract",
  b2b_sale: "B2B sale",
};

export function CollaborationProposalCard({
  idea,
  comments,
  currentUserId,
}: {
  idea: CollaborationIdea;
  comments: CollaborationComment[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isAuthor = currentUserId === idea.authorId;
  const interestCount = idea.interestedCount ?? 0;

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await commentOnCollaboration(idea.id, body.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="md:col-span-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
              {typeLabels[idea.collaborationType]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[idea.status]}`}
            >
              {idea.status.replace("_", " ")}
            </span>
            <span className="text-xs text-muted">{formatPostDateTime(idea.createdAt)}</span>
          </div>

          <Link href={`/partnerships/${idea.id}`} className="mt-3 block group">
            <h3 className="text-lg font-semibold group-hover:text-accent">{idea.title}</h3>
          </Link>
          <p className="mt-2 line-clamp-3 text-sm text-muted">{idea.summary}</p>

          <div className="mt-4 space-y-1 text-sm">
            <p>
              <span className="font-medium">Looking for:</span> {idea.lookingFor}
            </p>
            <p>
              <span className="font-medium">Location:</span> {idea.location}
            </p>
            <p className="text-xs text-muted">Posted by {idea.authorName}</p>
          </div>

          <Link
            href={`/partnerships/${idea.id}`}
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            View proposal →
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!isAuthor &&
              (currentUserId ? (
                <CollaborationInterestedButton
                  collaborationId={idea.id}
                  initialInterested={Boolean(idea.userInterested)}
                />
              ) : (
                <CollaborationInterestedButton
                  collaborationId={idea.id}
                  initialInterested={false}
                  requiresAuth
                />
              ))}
            <p className="text-sm text-muted">
              {interestCount} {interestCount === 1 ? "person" : "people"} interested
            </p>
          </div>
        </div>

        <div className="flex max-h-80 flex-col border-t border-border bg-slate-50/60 md:max-h-none md:border-l md:border-t-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Discussion</p>
            {comments.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No comments yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {comments.slice(-6).map((comment) => (
                  <li key={comment.id} className="text-xs">
                    <span className="font-medium">{comment.authorName}</span>
                    <span className="text-muted"> · {comment.body}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            onSubmit={handleComment}
            className="flex flex-col gap-2 border-t border-border px-3 py-3 sm:flex-row"
          >
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-2.5 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className="min-h-10 shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Reply
            </button>
          </form>
          {error && <p className="px-3 pb-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
