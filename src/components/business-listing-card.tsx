"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFollowBusiness } from "@/lib/actions/social";
import { BusinessMessageModal } from "@/components/business-message-modal";
import { ServiceListing } from "@/components/service-listing";
import { displayCategoryLabel } from "@/lib/industries";
import type { BusinessPost, BusinessProfile } from "@/lib/types";
import { Card, formatPostDateTime, StarRating } from "@/components/ui";

const actionButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-full border px-4 text-sm font-medium disabled:opacity-50";

function formatLocation(business: BusinessProfile): string {
  const parts = [business.city, business.state].filter(Boolean);
  if (business.zipCode) parts.push(business.zipCode);
  const location = parts.join(", ");
  const country = business.country && business.country !== "US" ? ` · ${business.country}` : "";
  return `${location}${country}`;
}

export function BusinessListingCard({
  business,
  latestPosts = [],
  currentUserId,
}: {
  business: BusinessProfile;
  latestPosts?: BusinessPost[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(
    currentUserId ? business.followerIds.includes(currentUserId) : false,
  );
  const [error, setError] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const cover = business.mediaUrls[0];
  const topServices = business.services.filter((s) => s.name.trim()).slice(0, 2);
  const isOwner = currentUserId === business.ownerId;
  const latestPost = latestPosts[0];

  function handleFollow(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) { router.push("/auth/login"); return; }
    startTransition(async () => {
      setError(null);
      const result = await toggleFollowBusiness(business.id);
      if (result.error) { setError(result.error); return; }
      setIsFollowing((v) => !v);
      router.refresh();
    });
  }

  function handleMessage(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) { router.push("/auth/login"); return; }
    setError(null);
    setMessageOpen(true);
  }

  return (
    <>
      <Card className="group flex overflow-hidden p-0 transition hover:border-accent/40 hover:shadow-md">
        {/* Left: cover image */}
        <Link
          href={`/listings/${business.id}`}
          className="relative block w-44 shrink-0 self-stretch overflow-hidden border-r border-border bg-slate-100 sm:w-56"
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-50">
              <span className="text-5xl font-bold text-accent/20">{business.name.charAt(0)}</span>
            </div>
          )}
        </Link>

        {/* Right: content */}
        <div className="flex min-w-0 flex-1 flex-col p-4">
          {/* Header: name, category, tagline, rating */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {displayCategoryLabel(business.category, business.subcategory)}
              </p>
              <Link href={`/listings/${business.id}`}>
                <h3 className="mt-0.5 text-xl font-bold leading-snug group-hover:text-accent">
                  {business.name}
                </h3>
              </Link>
              {business.tagline && (
                <p className="mt-0.5 line-clamp-1 text-sm text-muted">{business.tagline}</p>
              )}
            </div>
            {business.ratingCount > 0 && (
              <div className="shrink-0">
                <StarRating rating={business.ratingAvg} count={business.ratingCount} size="md" />
              </div>
            )}
          </div>

          {/* Likes + followers */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {business.likeCount > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                {business.likeCount} likes
              </span>
            )}
            {business.followerIds.length > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-accent">
                {business.followerIds.length} followers
              </span>
            )}
          </div>

          {/* Offerings + Latest update in two columns */}
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {topServices.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Offerings</p>
                <ul className="space-y-1">
                  {topServices.map((service) => (
                    <li key={service.name} onClick={(e) => e.stopPropagation()}>
                      <ServiceListing
                        service={service}
                        businessId={business.id}
                        businessName={business.name}
                        currentUserId={currentUserId}
                        isOwner={isOwner}
                        renderTrigger={(onClick) => (
                          <button
                            type="button"
                            onClick={onClick}
                            className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left transition hover:border-accent/40 hover:bg-slate-50"
                          >
                            {service.imageUrl ? (
                              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={service.imageUrl} alt="" className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-accent/40">
                                {service.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium leading-tight">{service.name}</p>
                              {service.price && (
                                <p className="text-[11px] font-medium text-accent">{service.price}</p>
                              )}
                            </div>
                            <span className="shrink-0 text-xs font-medium text-accent">Order →</span>
                          </button>
                        )}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Latest update</p>
              {latestPost ? (
                <Link
                  href={`/listings/${business.id}#post-${latestPost.id}`}
                  className="block rounded-lg border border-border bg-slate-50/80 px-2.5 py-2 transition hover:border-accent/40"
                >
                  <p className="line-clamp-2 text-xs font-medium leading-snug">{latestPost.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{formatPostDateTime(latestPost.createdAt)}</p>
                </Link>
              ) : (
                <p className="text-xs text-muted">No posts yet.</p>
              )}
            </div>
          </div>

          {/* Footer: Follow/Message + location */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 mt-3">
            <Link
              href={`/listings/${business.id}`}
              className="text-xs text-muted hover:text-accent"
            >
              {formatLocation(business)}
              <span className="ml-1 text-accent">· View listing →</span>
            </Link>

            {!isOwner && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleFollow}
                  className={`${actionButtonClass} ${
                    isFollowing
                      ? "border-accent bg-teal-50 text-accent"
                      : "border-border bg-card hover:border-accent/40"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleMessage}
                  className={`${actionButtonClass} border-border bg-card hover:border-accent/40`}
                >
                  Message
                </button>
              </div>
            )}

            {error && <p className="w-full text-xs text-red-600">{error}</p>}
          </div>
        </div>
      </Card>

      <BusinessMessageModal
        businessId={business.id}
        businessName={business.name}
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        currentUserId={currentUserId}
      />
    </>
  );
}
