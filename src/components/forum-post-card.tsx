import Link from "next/link";
import { ForumPostLikeButton } from "@/components/forum-post-like-button";
import type { ForumPost } from "@/lib/types";
import { Card, CategoryBadge, formatDate } from "./ui";

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

  return (
    <Card className="overflow-hidden p-0 transition hover:border-accent/40 hover:shadow-md">
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt=""
          className="h-44 w-full object-cover border-b border-border"
          loading="lazy"
        />
      )}

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-muted">{formatDate(post.createdAt)}</span>
        </div>

        <Link href={link} className="block">
          <h3 className="mt-3 text-lg font-semibold">{post.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted">{post.body}</p>
        </Link>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {post.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.authorAvatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover border border-border"
                loading="lazy"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-slate-100 text-xs font-bold text-accent/60">
                {post.authorName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              {post.businessId ? (
                <Link
                  href={`/listings/${post.businessId}`}
                  className="truncate text-xs font-medium text-accent hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.authorName}
                </Link>
              ) : (
                <span className="truncate text-xs text-muted">{post.authorName}</span>
              )}
              <p className="text-[11px] text-muted">
                {post.commentIds.length} {post.commentIds.length === 1 ? "reply" : "replies"}
              </p>
            </div>
          </div>

          <ForumPostLikeButton
            postId={post.id}
            initialLiked={post.likedByViewer ?? false}
            initialCount={post.likeCount ?? 0}
            requiresAuth={!currentUserId}
          />
        </div>
      </div>
    </Card>
  );
}
