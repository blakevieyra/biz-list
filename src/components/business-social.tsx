"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitBusinessReview } from "@/lib/actions/business";
import { ContentLikeButton } from "@/components/content-like-button";
import { BusinessPostCommentThread } from "@/components/business-post-comment-thread";
import { PostMediaGallery, PostTypeBadge } from "@/components/post-media";
import {
  contentLikeKey,
  isContentLiked,
  type ContentLikeState,
} from "@/lib/content-likes-types";
import type { BusinessPost, BusinessReview } from "@/lib/types";
import { Card } from "@/components/ui";

export function BusinessReviewsSection({
  businessId,
  reviews,
  ratingAvg,
  ratingCount,
  currentUserId,
  isOwner,
}: {
  businessId: string;
  reviews: BusinessReview[];
  ratingAvg: number;
  ratingCount: number;
  currentUserId: string | null;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await submitBusinessReview({ businessId, rating, body });
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <Card id="reviews">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">Reviews & feedback</h2>
        {ratingCount > 0 && (
          <p className="text-sm text-muted">
            {ratingAvg.toFixed(1)} ★ · {ratingCount} review{ratingCount === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {currentUserId && !isOwner && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-b border-border pb-4">
          <label className="block text-sm">
            Rating
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} stars
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Your feedback
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Share your experience..."
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Submit review
          </button>
        </form>
      )}

      <ul className="mt-4 space-y-4">
        {reviews.length === 0 && (
          <li className="text-sm text-muted">No reviews yet. Be the first to share feedback.</li>
        )}
        {reviews.map((review) => (
          <li key={review.id} className="border-b border-border pb-4 last:border-0">
            <p className="text-sm font-medium">
              {review.authorName} · {"★".repeat(review.rating)}
            </p>
            <p className="mt-1 text-sm text-muted">{review.body}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function BusinessActivitySection({
  businessId,
  posts,
  currentUserId,
  isOwner,
  contentLikes = { counts: {}, userLiked: [] },
  maxPosts,
}: {
  businessId: string;
  posts: BusinessPost[];
  currentUserId: string | null;
  isOwner: boolean;
  contentLikes?: ContentLikeState;
  maxPosts?: number;
}) {
  const visiblePosts = maxPosts ? posts.slice(0, maxPosts) : posts;
  const hiddenCount = maxPosts ? Math.max(0, posts.length - maxPosts) : 0;
  const compact = maxPosts === 1;

  return (
    <Card id="activity">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{compact ? "Latest update" : "Business activity"}</h2>
        {isOwner && (
          <a href="/dashboard/posts" className="text-xs text-accent hover:underline">
            Manage posts →
          </a>
        )}
      </div>

      <ul className="mt-3 space-y-4">
        {visiblePosts.length === 0 && (
          <li className="text-sm text-muted">
            No activity yet.{" "}
            {isOwner ? "Publish updates from Posts & marketing." : ""}
          </li>
        )}
        {visiblePosts.map((post) => {
          const likeKey = contentLikeKey("post", post.id);
          return (
            <li
              key={post.id}
              id={`post-${post.id}`}
              className={`scroll-mt-24 rounded-xl border border-border ${compact ? "p-3" : "p-4"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <PostTypeBadge type={post.postType} />
                <h3 className={`font-medium ${compact ? "text-sm" : ""}`}>{post.title}</h3>
                {!compact && post.isTrending && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Trending
                  </span>
                )}
              </div>
              <p className={`mt-2 leading-relaxed text-muted ${compact ? "line-clamp-3 text-xs" : "text-sm"}`}>
                {post.body}
              </p>
              {!compact && post.mediaUrls.length > 0 && (
                <div className="mt-3">
                  <PostMediaGallery urls={post.mediaUrls} />
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <ContentLikeButton
                  businessId={businessId}
                  targetType="post"
                  targetId={post.id}
                  initialCount={contentLikes.counts[likeKey] ?? post.likeCount}
                  initialLiked={isContentLiked(contentLikes, "post", post.id)}
                />
                <p className="text-xs text-muted">
                  {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
                </p>
              </div>

              {!compact && (
                <div className="mt-3 rounded-lg border border-border bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Comments
                  </p>
                  <div className="mt-2">
                    <BusinessPostCommentThread
                      postId={post.id}
                      businessId={businessId}
                      comments={post.recentComments ?? []}
                      currentUserId={currentUserId}
                      placeholder="Join the thread..."
                      submitLabel="Post"
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && (
        <p className="mt-3 text-xs text-muted">
          {hiddenCount} more update{hiddenCount === 1 ? "" : "s"} on the{" "}
          <a href="/feed" className="text-accent hover:underline">
            feed
          </a>
          .
        </p>
      )}
    </Card>
  );
}

/** @deprecated Use BusinessActivitySection */
export const BusinessPostsSection = BusinessActivitySection;

export function BusinessPhotosSection({
  businessId,
  mediaUrls,
  contentLikes,
}: {
  businessId: string;
  mediaUrls: string[];
  contentLikes: ContentLikeState;
}) {
  if (mediaUrls.length <= 1) return null;

  return (
    <Card id="photos">
      <h2 className="font-semibold">Photos</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {mediaUrls.slice(1).map((url, index) => {
          const likeKey = contentLikeKey("photo", url);
          return (
            <div
              key={`${url}-${index}`}
              className="overflow-hidden rounded-xl border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              <div className="border-t border-border p-2">
                <ContentLikeButton
                  businessId={businessId}
                  targetType="photo"
                  targetId={url}
                  initialCount={contentLikes.counts[likeKey] ?? 0}
                  initialLiked={isContentLiked(contentLikes, "photo", url)}
                  size="sm"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function BusinessGallerySection({
  businessId,
  mediaUrls,
  owner,
  contentLikes,
}: {
  businessId: string;
  mediaUrls: string[];
  owner: { id: string; displayName: string; bio?: string } | null;
  contentLikes: ContentLikeState;
}) {
  const galleryUrls = mediaUrls.length > 1 ? mediaUrls.slice(1) : mediaUrls;
  if (galleryUrls.length === 0 && !owner) return null;

  const ownerInitials = owner?.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <h2 className="text-sm font-semibold">Photos</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {galleryUrls.map((url, index) => {
            const likeKey = contentLikeKey("photo", url);
            return (
              <div
                key={`${url}-${index}`}
                className="w-36 shrink-0 overflow-hidden rounded-xl border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full object-cover" />
                <div className="border-t border-border p-1.5">
                  <ContentLikeButton
                    businessId={businessId}
                    targetType="photo"
                    targetId={url}
                    initialCount={contentLikes.counts[likeKey] ?? 0}
                    initialLiked={isContentLiked(contentLikes, "photo", url)}
                    size="sm"
                  />
                </div>
              </div>
            );
          })}
          {owner && (
            <div className="flex w-36 shrink-0 flex-col rounded-xl border border-border p-3 text-center">
              <div className="mx-auto flex aspect-square w-full max-w-[7rem] items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-slate-100 text-lg font-bold text-accent">
                {ownerInitials || "?"}
              </div>
              <p className="mt-2 text-xs font-medium leading-tight">{owner.displayName}</p>
              <p className="mt-0.5 text-[11px] text-muted">Owner</p>
              {owner.bio && (
                <p className="mt-2 line-clamp-3 text-[11px] leading-snug text-muted">{owner.bio}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
