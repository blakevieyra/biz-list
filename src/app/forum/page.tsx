import Link from "next/link";
import { ForumPostCard } from "@/components/forum-post-card";
import { PageHeader } from "@/components/ui";
import { getForumPosts } from "@/lib/data";
import type { ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

const categories = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const categoryFilter = params.category as ForumCategory | undefined;
  const posts = await getForumPosts(categoryFilter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Community Forum"
        description="Share legal lessons learned, ask local questions, discuss hiring, and explore partnership ideas. Comment on posts to help others."
        action={
          <Link
            href="/forum/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            New post
          </Link>
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/forum"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            !categoryFilter
              ? "bg-accent text-white"
              : "border border-border bg-card text-muted hover:text-foreground"
          }`}
        >
          All topics
        </Link>
        {categories.map((category) => (
          <Link
            key={category}
            href={`/forum?category=${category}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              categoryFilter === category
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {FORUM_CATEGORY_LABELS[category]}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <ForumPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
