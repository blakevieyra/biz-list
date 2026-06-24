"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { commentOnBusinessPost } from "@/lib/actions/business";
import { ContentLikeButton } from "@/components/content-like-button";
import { PostTypeBadge } from "@/components/post-media";
import { isImageUrl } from "@/lib/media/post-media";
import type { BusinessPost, FeedPostBadge } from "@/lib/types";
import { Card, formatPostDateTime, StarRating } from "@/components/ui";

const badgeLabels: Record<FeedPostBadge, string> = {
  following: "Following",
  trending: "Trending",
  "top-rated": "Top rated",
  popular: "Popular",
};

function LazyMedia({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !src) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div ref={ref} className={`overflow-hidden bg-slate-100 ${className ?? ""}`}>
      {visible && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-accent/25">
          {alt.charAt(0)}
        </div>
      )}
    </div>
  );
}

export function FeedPostCard({
  post,
  currentUserId,
}: {
  post: BusinessPost;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mediaSrc =
    post.mediaUrls.find(isImageUrl) ?? post.businessMediaUrl ?? undefined;

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await commentOnBusinessPost(post.id, comment.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setComment("");
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col sm:flex-row">
        <Link
          href={`/listings/${post.businessId}`}
          className="block w-full shrink-0 sm:w-36 md:w-40"
        >
          <LazyMedia
            src={mediaSrc}
            alt={post.businessName ?? "Business"}
            className="aspect-square h-full min-h-[120px] border-b border-border sm:min-h-[140px] sm:border-b-0 sm:border-r"
          />
        </Link>

        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PostTypeBadge type={post.postType} />
                {post.feedBadge && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
                    {badgeLabels[post.feedBadge]}
                  </span>
                )}
              </div>
              <Link
                href={`/listings/${post.businessId}`}
                className="mt-1 block text-sm font-semibold text-accent hover:underline"
              >
                {post.businessName ?? "Local business"}
              </Link>
              {post.businessCategory && (
                <p className="text-xs text-muted">{post.businessCategory}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted">{formatPostDateTime(post.createdAt)}</span>
          </div>

          {(post.businessRatingCount ?? 0) > 0 && (
            <div className="mt-2">
              <StarRating
                rating={post.businessRatingAvg ?? 0}
                count={post.businessRatingCount}
              />
            </div>
          )}

          <h3 className="mt-2 text-base font-semibold leading-snug">{post.title}</h3>
          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted">{post.body}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ContentLikeButton
              businessId={post.businessId}
              targetType="post"
              targetId={post.id}
              initialCount={post.likeCount}
              initialLiked={false}
              size="sm"
            />
            <span className="text-xs text-muted">
              {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
            </span>
            {(post.businessLikeCount ?? 0) > 0 && (
              <span className="text-xs text-muted">{post.businessLikeCount} business likes</span>
            )}
          </div>
        </div>
      </div>

      {(post.recentComments?.length ?? 0) > 0 && (
        <div className="border-t border-border bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Comments</p>
          <ul className="mt-2 space-y-2">
            {post.recentComments!.map((item) => (
              <li key={item.id} className="text-sm">
                <span className="font-medium">{item.authorName}</span>
                <span className="text-muted"> · {item.body}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={handleComment}
        className="flex gap-2 border-t border-border px-4 py-3"
      >
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !comment.trim()}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Reply
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-xs text-red-600">{error}</p>}
    </Card>
  );
}
