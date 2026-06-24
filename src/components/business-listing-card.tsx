"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { commentOnBusinessPost } from "@/lib/actions/business";
import { startMessageWithBusinessOwner, toggleFollowBusiness } from "@/lib/actions/social";
import { displayCategoryLabel } from "@/lib/industries";
import type { BusinessPost, BusinessProfile } from "@/lib/types";
import { Card } from "@/components/ui";

export function BusinessListingCard({
  business,
  latestPost,
  currentUserId,
}: {
  business: BusinessProfile;
  latestPost?: BusinessPost | null;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(
    currentUserId ? business.followerIds.includes(currentUserId) : false,
  );
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cover = business.mediaUrls[0];
  const topServices = business.services.filter((s) => s.name.trim()).slice(0, 2);
  const isOwner = currentUserId === business.ownerId;

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

  function handleAsk(e: React.MouseEvent) {
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

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!latestPost || !reply.trim()) return;
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await commentOnBusinessPost(latestPost.id, reply.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setReply("");
      router.refresh();
    });
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0 transition hover:border-accent/40 hover:shadow-md">
      <Link href={`/listings/${business.id}`} className="block">
        {cover ? (
          <div className="aspect-[3/1] max-h-[120px] overflow-hidden border-b border-border bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[3/1] max-h-[120px] items-center justify-center border-b border-border bg-gradient-to-br from-blue-50 to-slate-50">
            <span className="text-3xl font-bold text-accent/30">{business.name.charAt(0)}</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/listings/${business.id}`} className="block">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {displayCategoryLabel(business.category, business.subcategory)}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">{business.name}</h3>
          {business.tagline && (
            <p className="mt-1 line-clamp-1 text-sm text-muted">{business.tagline}</p>
          )}
        </Link>

        {topServices.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Top offerings</p>
            <ul className="mt-1 space-y-1">
              {topServices.map((service) => (
                <li key={service.name} className="text-sm">
                  <span className="font-medium">{service.name}</span>
                  {service.price ? (
                    <span className="text-muted"> · {service.price}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {latestPost && (
          <div
            className="mt-3 rounded-xl border border-border bg-slate-50/80 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Latest update</p>
            <p className="mt-1 text-sm font-medium">{latestPost.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{latestPost.body}</p>
            {!isOwner && (
              <form onSubmit={handleReply} className="mt-2 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply to this post..."
                  className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  disabled={pending || !reply.trim()}
                  className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Reply
                </button>
              </form>
            )}
          </div>
        )}

        {!isOwner && (
          <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={pending}
              onClick={handleFollow}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
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
              onClick={handleAsk}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-accent/40 disabled:opacity-50"
            >
              Message
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <Link
          href={`/listings/${business.id}`}
          className="mt-auto border-t border-border pt-3 text-xs text-muted"
        >
          {business.city}, {business.state}
          {business.zipCode ? ` ${business.zipCode}` : ""}
          {business.likeCount > 0 ? ` · ${business.likeCount} likes` : ""}
          <span className="ml-1 text-accent">· View listing →</span>
        </Link>
      </div>
    </Card>
  );
}
