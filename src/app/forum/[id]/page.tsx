import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentForm } from "@/components/comment-form";
import { Card, CategoryBadge, PageHeader, formatDate } from "@/components/ui";
import { getCommentsForPost, getForumPostById } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, userId] = await Promise.all([
    getForumPostById(id),
    getAuthUserId(),
  ]);

  if (!post) {
    notFound();
  }

  const comments = await getCommentsForPost(post.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/forum" className="text-sm text-accent hover:underline">
        ← Back to forum
      </Link>

      <article className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-muted">{formatDate(post.createdAt)}</span>
        </div>
        <PageHeader title={post.title} description={`Posted by ${post.authorName}`} />
        <Card>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
        </Card>
      </article>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Comments ({comments.length})</h2>
        <div className="mt-4 space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{comment.authorName}</p>
                <span className="text-xs text-muted">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{comment.body}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <h3 className="font-medium">Add a comment</h3>
          <CommentForm postId={post.id} isAuthenticated={Boolean(userId)} />
        </Card>
      </section>
    </div>
  );
}
