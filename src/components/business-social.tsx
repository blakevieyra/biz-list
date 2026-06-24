"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { commentOnBusinessPost, submitBusinessReview } from "@/lib/actions/business";
import { PostMediaGallery, PostTypeBadge } from "@/components/post-media";
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
    <Card>
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

export function BusinessPostsSection({
  businessId,
  posts,
  currentUserId,
  isOwner,
}: {
  businessId: string;
  posts: BusinessPost[];
  currentUserId: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [commentBodies, setCommentBodies] = useState<Record<string, string>>({});

  function handleComment(postId: string) {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    const body = commentBodies[postId]?.trim();
    if (!body) return;

    startTransition(async () => {
      await commentOnBusinessPost(postId, body);
      setCommentBodies((prev) => ({ ...prev, [postId]: "" }));
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Business posts & threads</h2>
        {isOwner && (
          <a
            href="/dashboard/posts"
            className="text-sm text-accent hover:underline"
          >
            Create post →
          </a>
        )}
      </div>

      <ul className="mt-4 space-y-6">
        {posts.length === 0 && (
          <li className="text-sm text-muted">
            No posts yet. {isOwner ? "Publish updates, jobs, deals, or video from Posts & marketing." : ""}
          </li>
        )}
        {posts.map((post) => (
          <li key={post.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <PostTypeBadge type={post.postType} />
              <h3 className="font-medium">{post.title}</h3>
              {post.isTrending && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Trending
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed">{post.body}</p>
            {post.mediaUrls.length > 0 && (
              <div className="mt-3">
                <PostMediaGallery urls={post.mediaUrls} />
              </div>
            )}
            <p className="mt-2 text-xs text-muted">
              {post.commentCount} comment{post.commentCount === 1 ? "" : "s"} · score {post.engagementScore}
            </p>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={commentBodies[post.id] ?? ""}
                onChange={(e) =>
                  setCommentBodies((prev) => ({ ...prev, [post.id]: e.target.value }))
                }
                placeholder="Join the thread..."
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => handleComment(post.id)}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                Reply
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
