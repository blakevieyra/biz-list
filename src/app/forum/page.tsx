import Link from "next/link";
import { ForumDiscussionsSection } from "@/components/forum-discussions-section";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import type { ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

const forumCategories = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const userId = await getAuthUserId();
  const category = forumCategories.includes(params.category as ForumCategory)
    ? (params.category as ForumCategory)
    : undefined;
  const query = params.q ?? "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Community forum"
        description="Ask questions, share local tips, discuss partnerships, and learn from other businesses and customers."
        action={
          userId ? (
            <Link
              href="/forum/new"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              New discussion
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Sign in to post
            </Link>
          )
        }
      />

      <ForumDiscussionsSection basePath="/forum" category={category} query={query} />
    </div>
  );
}
