"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ForumPostLikeButton } from "@/components/forum-post-like-button";
import { deleteForumPost } from "@/lib/actions/social";
import { ReportButton } from "@/components/report-button";
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
  const router = useRouter();
  const [deletePending, startDeleteTransition] = useTransition();
  const link = href ?? `/forum?post=${post.id}`;
  const replyCount = post.commentIds.length;
  const likeCount = post.likeCount ?? 0;
  const isAuthor = currentUserId != null && post.authorId === currentUserId;

  function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    startDeleteTransition(async () => {
      await deleteForumPost(post.id);
      router.refresh();
    });
  }

  const photoUrl = post.imageUrl ?? post.authorAvatarUrl;

  return (
    <div className="flex min-h-[100px] overflow-hidden rounded-2xl border border-border bg-card transition hover:border-accent/40 hover:shadow-sm">
      {/* Left photo column */}
      <div className="w-16 shrink-0 self-stretch overflow-hidden border-r border-border bg-slate-100 sm:w-20">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent/10 text-xl font-bold text-accent/40">
            {post.authorName.charAt(0)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 px-4 py-3">
        {/* Top row: category · time */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-muted">{formatPostDateTime(post.createdAt)}</span>
        </div>

        {/* Title */}
        <Link href={link} className="mt-1 block">
          <h3 className="text-base font-semibold leading-snug hover:text-accent">{post.title}</h3>
        </Link>

        {/* Body preview */}
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{post.body}</p>

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
          {isAuthor && (
            <button
              type="button"
              disabled={deletePending}
              onClick={handleDelete}
              className="ml-auto text-xs text-muted hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {deletePending ? "Deleting…" : "Delete"}
            </button>
          )}
          {!isAuthor && currentUserId && (
            <span className="ml-auto">
              <ReportButton target={{ type: "forum_post", id: post.id, title: post.title }} />
            </span>
          )}
        </div>
      </div>

      {/* Like button */}
      <div className="flex shrink-0 items-center border-l border-border px-3">
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
