"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CollaborationInterestedButton } from "@/components/collaboration-interested-button";
import { commentOnCollaboration, deleteCollaboration, deleteCollaborationComment, editCollaborationComment } from "@/lib/actions/social";
import { ReportButton } from "@/components/report-button";
import type { CollaborationComment, CollaborationIdea } from "@/lib/types";
import { Card, formatPostDateTime, StarRating } from "@/components/ui";

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
  const [deletePending, startDeleteTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState("");
  const [commentActionPending, startCommentAction] = useTransition();
  const isAuthor = currentUserId === idea.authorId;
  const interestCount = idea.interestedCount ?? 0;

  function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    startCommentAction(async () => {
      await deleteCollaborationComment(commentId);
      router.refresh();
    });
  }

  function handleEditCommentSave(e: React.FormEvent, commentId: string) {
    e.preventDefault();
    startCommentAction(async () => {
      await editCollaborationComment(commentId, editCommentBody);
      setEditingCommentId(null);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this collaboration? This cannot be undone.")) return;
    startDeleteTransition(async () => {
      await deleteCollaboration(idea.id);
      router.refresh();
    });
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (!currentUserId) { router.push("/auth/login"); return; }
    startTransition(async () => {
      setError(null);
      const result = await commentOnCollaboration(idea.id, body.trim());
      if (result.error) { setError(result.error); return; }
      setBody("");
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-1 md:grid-cols-3">

        {/* ── Left: collaboration content (2/3) ── */}
        <div className="md:col-span-2 flex flex-col">

          {/* Top bar: business identity + status badges */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {idea.businessMediaUrl && (
                <img
                  src={idea.businessMediaUrl}
                  alt={idea.businessName ?? ""}
                  className="h-4 w-4 shrink-0 rounded object-cover opacity-80"
                />
              )}
              {idea.businessId ? (
                <Link
                  href={`/listings/${idea.businessId}`}
                  className="text-xs font-medium text-muted hover:text-accent truncate"
                >
                  {idea.businessName ?? idea.authorName}
                </Link>
              ) : (
                <span className="text-xs font-medium text-muted truncate">
                  {idea.businessName ?? idea.authorName}
                </span>
              )}
              {(idea.businessRatingCount ?? 0) > 0 && (
                <StarRating
                  rating={idea.businessRatingAvg ?? 0}
                  count={idea.businessRatingCount}
                  size="sm"
                  compact
                />
              )}
              {idea.businessCategory && (
                <span className="text-[11px] text-muted/70">{idea.businessCategory}</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
                {typeLabels[idea.collaborationType]}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[idea.status]}`}>
                {idea.status.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col px-4 py-3">
            <Link href={`/partnerships/${idea.id}`} className="group block">
              <h3 className="text-2xl font-bold leading-snug group-hover:text-accent sm:text-3xl">
                {idea.title}
              </h3>
            </Link>

            {idea.lookingFor && (
              <p className="mt-3 text-sm">
                <span className="font-medium">Looking for:</span>{" "}
                <span className="text-muted">{idea.lookingFor}</span>
              </p>
            )}

            {/* Footer row: location · date · interested */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {idea.location && <span>Location: {idea.location}</span>}
                <span>
                  {interestCount} interested · {formatPostDateTime(idea.createdAt)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
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
                <Link
                  href={`/partnerships/${idea.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  View proposal →
                </Link>
                {isAuthor && (
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={handleDelete}
                    className="text-xs text-muted hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletePending ? "Deleting…" : "Delete"}
                  </button>
                )}
                {!isAuthor && currentUserId && (
                  <ReportButton target={{ type: "collaboration", id: idea.id, title: idea.title }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: discussion (1/3) ── */}
        <div className="flex max-h-80 flex-col border-t border-border bg-slate-50/60 md:max-h-none md:border-l md:border-t-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Discussion</p>
            {comments.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No comments yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {comments.slice(-6).map((comment) => {
                  const isOwnComment = currentUserId === comment.authorId;
                  return (
                    <li key={comment.id} className="text-xs">
                      {editingCommentId === comment.id ? (
                        <form onSubmit={(e) => handleEditCommentSave(e, comment.id)} className="flex gap-1.5">
                          <input
                            value={editCommentBody}
                            onChange={(e) => setEditCommentBody(e.target.value)}
                            className="min-w-0 flex-1 rounded border border-border px-1.5 py-0.5 text-xs"
                            autoFocus
                          />
                          <button type="submit" disabled={commentActionPending} className="font-medium text-accent hover:underline disabled:opacity-50">Save</button>
                          <button type="button" onClick={() => setEditingCommentId(null)} className="text-muted hover:underline">Cancel</button>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between gap-1">
                          <span>
                            <span className="font-medium">{comment.authorName}</span>
                            <span className="text-muted"> · {comment.body}</span>
                          </span>
                          {isOwnComment && (
                            <div className="flex shrink-0 gap-2 ml-1">
                              <button type="button" onClick={() => { setEditingCommentId(comment.id); setEditCommentBody(comment.body); }} className="text-muted hover:text-foreground">Edit</button>
                              <button type="button" onClick={() => handleDeleteComment(comment.id)} disabled={commentActionPending} className="text-muted hover:text-red-600 disabled:opacity-50">Delete</button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
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
