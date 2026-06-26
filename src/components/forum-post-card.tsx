import Link from "next/link";
import { ForumPostLikeButton } from "@/components/forum-post-like-button";
import type { ForumPost } from "@/lib/types";
import { CategoryBadge, formatPostDateTime } from "./ui";

export function ForumPostCard({
  post,
  href,
  currentUserId,
}: {
  post: ForumPost;
  href?: string;
  currentUserId?: string | null;
}) {
  const link = href ?? `/forum?post=${post.id}`;
  const replyCount = post.commentIds.length;
  const likeCount = post.likeCount ?? 0;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-accent/40 hover:shadow-sm">
      {/* Avatar */}
      <div className="mt-0.5 shrink-0">
        {post.authorAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.authorAvatarUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
            loading="lazy"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
            {post.authorName.charAt(0)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Top row: category · time */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-muted">{formatPostDateTime(post.createdAt)}</span>
        </div>

        {/* Title */}
        <Link href={link} className="mt-1 block">
          <h3 className="text-sm font-semibold leading-snug hover:text-accent">{post.title}</h3>
        </Link>

        {/* Body preview */}
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{post.body}</p>

        {/* Stats row */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
          {post.businessId ? (
            <Link
              href={`/listings/${post.businessId}`}
              className="font-medium text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {post.authorName}
            </Link>
          ) : (
            <span className="font-medium text-foreground/70">{post.authorName}</span>
          )}
          <span>·</span>
          <span>{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
          {likeCount > 0 && (
            <>
              <span>·</span>
              <span>{likeCount} interested</span>
            </>
          )}
        </div>
      </div>

      {/* Like button */}
      <div className="shrink-0 self-center">
        <ForumPostLikeButton
          postId={post.id}
          initialLiked={post.likedByViewer ?? false}
          initialCount={post.likeCount ?? 0}
          requiresAuth={!currentUserId}
        />
      </div>
    </div>
  );
}
