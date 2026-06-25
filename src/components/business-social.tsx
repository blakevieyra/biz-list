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
  currentUserId,
  isOwner,
}: {
  businessId: string;
  reviews: BusinessReview[];
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
    <Card id="reviews" className="scroll-mt-24">
      <h2 className="font-semibold">Reviews</h2>

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

export function BusinessGallerySection({ mediaUrls }: { mediaUrls: string[] }) {
  const galleryUrls = mediaUrls.length > 1 ? mediaUrls.slice(1) : mediaUrls;
  if (galleryUrls.length === 0) return null;

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {galleryUrls.length > 0 && (
          <>
            <h2 className="text-sm font-semibold">Photos</h2>
            <div className="mt-4 space-y-4">
              {galleryUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="overflow-hidden rounded-2xl border border-border bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="max-h-[32rem] w-full object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
