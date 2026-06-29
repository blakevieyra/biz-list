"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BusinessPostCommentThread } from "@/components/business-post-comment-thread";
import { ContentLikeButton } from "@/components/content-like-button";
import { PostTypeBadge } from "@/components/post-media";
import { isDirectVideoUrl, isImageUrl, isVideoUrl, youtubeEmbedUrl } from "@/lib/media/post-media";
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
  const postVideoSrc = post.mediaUrls.find(isVideoUrl);
  const youtubeId = postVideoSrc ? (() => {
    const embed = youtubeEmbedUrl(postVideoSrc);
    return embed ? embed.split("/embed/")[1]?.split("?")[0] ?? null : null;
  })() : null;
  const isDirectVideo = postVideoSrc ? isDirectVideoUrl(postVideoSrc) : false;

  const hasStats =
    (post.businessFollowerCount ?? 0) > 0 || (post.businessLikeCount ?? 0) > 0;

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr]">

        {/* ── Left: self-start so it — not the comments — dictates card height ── */}
        <div className="flex min-w-0 flex-col border-b border-border lg:self-start lg:border-b-0 lg:border-r">

          {/* Business identity header */}
          <div className="flex border-b border-border">
            {/* Photo — taller and wider for more visual impact */}
            <Link
              href={`/listings/${post.businessId}`}
              className="relative block w-32 shrink-0 self-stretch overflow-hidden bg-slate-100 sm:w-40"
            >
              <LazyAvatar fill src={avatarSrc} alt={post.businessName ?? "Business"} />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 p-3">
              {/* Top row: badges + date */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <PostTypeBadge type={post.postType} />
                  {post.feedBadge && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-accent">
                      {badgeLabels[post.feedBadge]}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-right text-[11px] leading-snug text-muted">
                  {formatPostDateTime(post.createdAt)}
                </span>
              </div>

              {/* Business name + rating inline */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <Link
                  href={`/listings/${post.businessId}`}
                  className="text-lg font-bold leading-tight text-foreground hover:text-accent sm:text-xl"
                >
                  {post.businessName ?? "Local business"}
                </Link>
                {(post.businessRatingCount ?? 0) > 0 && (
                  <StarRating
                    rating={post.businessRatingAvg ?? 0}
                    count={post.businessRatingCount}
                    size="sm"
                  />
                )}
              </div>

              {/* Category + stats */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                {post.businessCategory && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                    {post.businessCategory}
                  </span>
                )}
                {hasStats && (
                  <span className="text-muted">
                    {(post.businessFollowerCount ?? 0) > 0 && (
                      <>{post.businessFollowerCount} {post.businessFollowerCount === 1 ? "follower" : "followers"}</>
                    )}
                    {(post.businessFollowerCount ?? 0) > 0 && (post.businessLikeCount ?? 0) > 0 && " · "}
                    {(post.businessLikeCount ?? 0) > 0 && (
                      <>{post.businessLikeCount} {post.businessLikeCount === 1 ? "like" : "likes"}</>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Post content */}
          <div className="flex min-w-0 flex-1 flex-col p-3">
            <h3 className="text-xl font-bold leading-snug">{post.title}</h3>
            <p className="mt-2 text-sm leading-relaxed">{post.body}</p>

            {postMediaSrc && postMediaSrc !== avatarSrc && (
              <div className="mt-3 overflow-hidden rounded-lg border border-border bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={postMediaSrc} alt="" loading="lazy" className="w-full object-cover" />
              </div>
            )}

            {!postMediaSrc && postVideoSrc && (
              <div className="mt-3 overflow-hidden rounded-lg border border-border bg-black">
                {youtubeId ? (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
                      title="Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                ) : isDirectVideo ? (
                  <video
                    src={postVideoSrc}
                    controls
                    className="w-full"
                    preload="metadata"
                  />
                ) : null}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-2.5">
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
            </div>
          </div>
        </div>

        {/* ── Right: fills left's height, comments scroll inside ── */}
        <div className="flex flex-col overflow-hidden bg-slate-50/60">
          <p className="shrink-0 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Comments
          </p>
          <div className="min-h-0 flex-1 px-3 py-3">
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
