import Link from "next/link";
import { CommentForm } from "@/components/comment-form";
import { Card, CategoryBadge, formatDate } from "@/components/ui";
import { getCommentsForPost, getForumPostById } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";

export async function ForumPostThreadPanel({
  postId,
  closeHref,
}: {
  postId: string;
  closeHref: string;
}) {
  const [post, userId, comments] = await Promise.all([
    getForumPostById(postId),
    getAuthUserId(),
    getCommentsForPost(postId),
  ]);

  if (!post) return null;

  return (
    <Card className="mb-6 border-accent/30 ring-1 ring-accent/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={post.category} />
            <span className="text-xs text-muted">{formatDate(post.createdAt)}</span>
          </div>
          <h2 className="mt-2 text-xl font-semibold">{post.title}</h2>
          <p className="mt-1 text-sm text-muted">Posted by {post.authorName}</p>
        </div>
        <Link
          href={closeHref}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40"
        >
          Close
        </Link>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">{post.body}</p>

      <div className="mt-6 border-t border-border pt-6">
        <h3 className="font-semibold">Comments ({comments.length})</h3>
        <div className="mt-4 space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-border bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{comment.authorName}</p>
                  <span className="text-xs text-muted">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{comment.body}</p>
              </div>
            ))
          )}
        </div>
        <CommentForm postId={post.id} isAuthenticated={Boolean(userId)} />
      </div>
    </Card>
  );
}
