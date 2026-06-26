"use client";

import Link from "next/link";
import { CollaborationInterestedButton } from "@/components/collaboration-interested-button";
import type { CollaborationIdea } from "@/lib/types";
import { formatPostDateTime } from "@/components/ui";

const statusStyles = {
  open: "bg-emerald-100 text-emerald-800",
  in_discussion: "bg-amber-100 text-amber-800",
  closed: "bg-slate-100 text-slate-600",
};

const typeLabels: Record<string, string> = {
  proposal: "Proposal",
  contract: "Contract",
  b2b_sale: "B2B Sale",
};

const viewLabel: Record<string, string> = {
  proposal: "View proposal →",
  contract: "View contract →",
  b2b_sale: "View sale →",
};

export function CollaborationGridCard({
  idea,
  currentUserId,
}: {
  idea: CollaborationIdea;
  currentUserId?: string | null;
}) {
  const interestCount = idea.interestedCount ?? 0;
  const isAuthor = currentUserId != null && currentUserId === idea.authorId;

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-accent/40 hover:shadow-md">
      {/* Author row */}
      <div className="flex items-center gap-2.5">
        {idea.authorAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={idea.authorAvatarUrl}
            alt={idea.authorName}
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
            {idea.authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{idea.authorName}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
              {typeLabels[idea.collaborationType] ?? idea.collaborationType}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[idea.status]}`}>
              {idea.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      <Link href={`/partnerships/${idea.id}`} className="mt-3 block">
        <h3 className="text-base font-semibold leading-snug hover:text-accent">
          {idea.title}
        </h3>
      </Link>

      {/* Summary */}
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted">{idea.summary}</p>

      {/* Details */}
      <div className="mt-3 space-y-0.5 text-xs text-muted">
        <p><span className="font-medium text-foreground/80">Looking for:</span> {idea.lookingFor}</p>
        <p><span className="font-medium text-foreground/80">Location:</span> {idea.location}</p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        {!isAuthor ? (
          <div onClick={(e) => e.stopPropagation()}>
            <CollaborationInterestedButton
              collaborationId={idea.id}
              initialInterested={Boolean(idea.userInterested)}
              requiresAuth={!currentUserId}
              compact
            />
          </div>
        ) : (
          <span className="text-xs text-muted">Your post</span>
        )}
        <Link
          href={`/partnerships/${idea.id}`}
          className="shrink-0 text-xs font-medium text-accent hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {viewLabel[idea.collaborationType] ?? "View →"}
        </Link>
      </div>
      <p className="mt-2 text-xs text-muted">{interestCount} interested · {formatPostDateTime(idea.createdAt)}</p>
    </div>
  );
}
