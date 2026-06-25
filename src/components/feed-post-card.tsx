"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BusinessPostCommentThread } from "@/components/business-post-comment-thread";
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

function LazyAvatar({
  src,
  alt,
  fill = false,
}: {
  src?: string;
  alt: string;
  fill?: boolean;
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

  if (fill) {
    return (
      <div ref={ref} className="absolute inset-0 bg-slate-100">
        {visible && src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-3xl font-bold text-accent/25">
            {alt.charAt(0)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-slate-100"
    >
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
  const avatarSrc = post.businessMediaUrl;
  const postMediaSrc = post.mediaUrls.find(isImageUrl);

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <Link
              href={`/listings/${post.businessId}`}
              className="relative block min-h-[7.5rem] overflow-hidden border-r border-border bg-slate-100 sm:min-h-full"
            >
              <LazyAvatar fill src={avatarSrc} alt={post.businessName ?? "Business"} />
            </Link>

            <div className="min-w-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PostTypeBadge type={post.postType} />
                    {post.feedBadge && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
                        {badgeLabels[post.feedBadge]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Link
                      href={`/listings/${post.businessId}`}
                      className="truncate text-sm font-semibold text-accent hover:underline"
                    >
                      {post.businessName ?? "Local business"}
                    </Link>
                    {(post.businessRatingCount ?? 0) > 0 && (
                      <StarRating
                        rating={post.businessRatingAvg ?? 0}
                        count={post.businessRatingCount}
                        compact
                      />
                    )}
                  </div>
                  {post.businessCategory && (
                    <p className="truncate text-xs text-muted">{post.businessCategory}</p>
                  )}
                </div>
                <span className="shrink-0 text-right text-xs leading-snug text-muted">
                  {formatPostDateTime(post.createdAt)}
                </span>
              </div>

              <h3 className="mt-2 text-base font-semibold leading-snug">{post.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{post.body}</p>

              {postMediaSrc && postMediaSrc !== avatarSrc && (
                <div className="mt-3 overflow-hidden rounded-lg border border-border bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={postMediaSrc}
                    alt=""
                    loading="lazy"
                    className="max-h-40 w-full object-cover"
                  />
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ContentLikeButton
                  businessId={post.businessId}
                  targetType="post"
                  targetId={post.id}
                  initialCount={post.likeCount}
                  initialLiked={post.likedByViewer ?? false}
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
        </div>

        <div className="flex max-h-80 flex-col border-t border-border bg-slate-50/60 px-3 py-3 md:max-h-none md:border-l md:border-t-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Comments</p>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <BusinessPostCommentThread
              postId={post.id}
              businessId={post.businessId}
              comments={post.recentComments ?? []}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
