"use client";

import Link from "next/link";
import { CollaborationInterestedButton } from "@/components/collaboration-interested-button";
import type { CollaborationIdea } from "@/lib/types";
import { formatPostDateTime, StarRating } from "@/components/ui";

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
  const businessName = idea.businessName ?? "Local business";
  const businessInitial = businessName.charAt(0).toUpperCase();
  const listingHref = idea.businessId ? `/listings/${idea.businessId}` : undefined;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-accent/40 hover:shadow-md">
      <div className="flex flex-1">
        {/* Left image */}
        {listingHref ? (
          <Link
            href={listingHref}
            className="relative block w-1/3 shrink-0 self-stretch overflow-hidden border-r border-border bg-slate-100"
          >
            {idea.businessMediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={idea.businessMediaUrl}
                alt={businessName}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-accent/10 text-2xl font-bold text-accent/40">
                {businessInitial}
              </div>
            )}
          </Link>
        ) : (
          <div className="flex w-1/3 shrink-0 items-center justify-center self-stretch border-r border-border bg-accent/10 text-2xl font-bold text-accent/40">
            {businessInitial}
          </div>
        )}

        {/* Right content */}
        <div className="flex min-w-0 flex-1 flex-col p-4">
          {/* Top row: badges left, Interested button right */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
                {typeLabels[idea.collaborationType] ?? idea.collaborationType}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[idea.status]}`}
              >
                {idea.status.replace("_", " ")}
              </span>
            </div>

            {!isAuthor ? (
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <CollaborationInterestedButton
                  collaborationId={idea.id}
                  initialInterested={Boolean(idea.userInterested)}
                  requiresAuth={!currentUserId}
                  compact
                />
              </div>
            ) : (
              <span className="shrink-0 text-xs text-muted">Your post</span>
            )}
          </div>

          {/* Business name + rating */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            {listingHref ? (
              <Link href={listingHref} className="text-base font-bold text-accent hover:underline sm:text-xl">
                {businessName}
              </Link>
            ) : (
              <p className="text-base font-bold text-accent sm:text-xl">{businessName}</p>
            )}
            {(idea.businessRatingCount ?? 0) > 0 && (
              <StarRating
                rating={idea.businessRatingAvg ?? 0}
                count={idea.businessRatingCount}
                size="md"
              />
            )}
          </div>

          {idea.businessCategory && (
            <p className="text-sm font-medium text-muted">{idea.businessCategory}</p>
          )}

          <Link href={`/partnerships/${idea.id}`} className="mt-3 block">
            <h3 className="text-lg font-bold leading-snug group-hover:text-accent sm:text-xl">
              {idea.title}
            </h3>
          </Link>

          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{idea.summary}</p>

          <div className="mt-3 text-xs text-muted">
            <p>
              <span className="font-medium text-foreground/80">Location:</span> {idea.location}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {interestCount} interested · {formatPostDateTime(idea.createdAt)}
            </p>
            <Link
              href={`/partnerships/${idea.id}`}
              className="shrink-0 text-xs font-medium text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {viewLabel[idea.collaborationType] ?? "View →"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
