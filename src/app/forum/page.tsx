import Link from "next/link";
import { ForumDiscussionsSection } from "@/components/forum-discussions-section";
import { PageHeader } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data";
import type { ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

const forumCategories = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; post?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const canPost = profile && ["business", "organization", "marketer"].includes(profile.role);

  const category = forumCategories.includes(params.category as ForumCategory)
    ? (params.category as ForumCategory)
    : undefined;
  const query = params.q ?? "";
  const selectedPostId = params.post?.trim() || undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Forum"
        description="Community discussions about partnerships, local tips, hiring, and more."
        action={
          canPost ? (
            <Link
              href="/forum/new"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              New discussion
            </Link>
          ) : !profile ? (
            <Link
              href="/auth/login"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Sign in to post
            </Link>
          ) : null
        }
      />

      <ForumDiscussionsSection
        basePath="/forum"
        category={category}
        query={query}
        selectedPostId={selectedPostId}
      />
    </div>
  );
}
