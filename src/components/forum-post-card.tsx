import Link from "next/link";
import type { ForumPost } from "@/lib/types";
import { Card, CategoryBadge, formatDate } from "./ui";

export function ForumPostCard({ post }: { post: ForumPost }) {
  return (
    <Link href={`/forum/${post.id}`}>
      <Card className="transition hover:border-accent/40 hover:shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-muted">{formatDate(post.createdAt)}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold">{post.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{post.body}</p>
        <p className="mt-4 text-xs text-muted">
          by {post.authorName} · {post.commentIds.length} comments
        </p>
      </Card>
    </Link>
  );
}
