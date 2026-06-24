"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startMessageWithBusinessOwner, toggleFollowBusiness } from "@/lib/actions/social";
import { displayCategoryLabel } from "@/lib/industries";
import type { BusinessPost, BusinessProfile } from "@/lib/types";
import { Card, formatPostDateTime, StarRating } from "@/components/ui";

const actionButtonClass =
  "inline-flex min-h-9 w-full items-center justify-center rounded-full border px-3 text-sm font-medium disabled:opacity-50";

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
  const cover = business.mediaUrls[0];
  const topServices = business.services.filter((s) => s.name.trim()).slice(0, 2);
  const isOwner = currentUserId === business.ownerId;
  const posts = latestPosts.slice(0, 3);

  function handleFollow(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await toggleFollowBusiness(business.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsFollowing((v) => !v);
      router.refresh();
    });
  }

  function handleMessage(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await startMessageWithBusinessOwner(business.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.conversationId) router.push(`/messages/${result.conversationId}`);
    });
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0 transition hover:border-accent/40 hover:shadow-md">
      <Link href={`/listings/${business.id}`} className="block h-[32%] min-h-[110px] shrink-0">
        {cover ? (
          <div className="h-full overflow-hidden border-b border-border bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center border-b border-border bg-gradient-to-br from-blue-50 to-slate-50">
            <span className="text-3xl font-bold text-accent/30">{business.name.charAt(0)}</span>
          </div>
        )}
      </Link>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <Link href={`/listings/${business.id}`} className="block">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {displayCategoryLabel(business.category, business.subcategory)}
          </p>
          <h3 className="mt-0.5 text-base font-semibold leading-snug">{business.name}</h3>
          {business.tagline && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">{business.tagline}</p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {business.ratingCount > 0 && (
              <StarRating rating={business.ratingAvg} count={business.ratingCount} />
            )}
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
        </Link>

        {topServices.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Offerings</p>
            <ul className="mt-1 space-y-0.5">
              {topServices.map((service) => (
                <li key={service.name} className="text-xs leading-snug">
                  {service.serviceType && (
                    <span className="text-muted">{service.serviceType} · </span>
                  )}
                  <span className="font-medium">{service.name}</span>
                  {service.price ? <span className="text-muted"> · {service.price}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-2 flex min-h-[132px] flex-1 flex-col">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Latest</p>
          {posts.length > 0 ? (
            <ul className="mt-1 flex flex-1 flex-col gap-1.5">
              {posts.map((post) => (
                <li key={post.id} className="flex-1">
                  <Link
                    href={`/listings/${business.id}#post-${post.id}`}
                    className="block h-full rounded-lg border border-border bg-slate-50/80 px-2.5 py-2 transition hover:border-accent/40"
                  >
                    <p className="line-clamp-1 text-xs font-medium leading-snug">{post.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatPostDateTime(post.createdAt)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted">
                      {post.likeCount} {post.likeCount === 1 ? "like" : "likes"} · {post.commentCount}{" "}
                      {post.commentCount === 1 ? "comment" : "comments"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted">No posts yet.</p>
          )}
        </div>

        {!isOwner && (
          <div className="mt-2 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
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

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

        <Link
          href={`/listings/${business.id}`}
          className="mt-2 border-t border-border pt-2 text-xs text-muted"
        >
          {business.city}, {business.state}
          {business.zipCode ? ` ${business.zipCode}` : ""}
          <span className="ml-1 text-accent">· View listing →</span>
        </Link>
      </div>
    </Card>
  );
}
