import Link from "next/link";
import { CollaborationProposalCard } from "@/components/collaboration-proposal-card";
import { ForumDiscussionsSection } from "@/components/forum-discussions-section";
import { getAuthUserId } from "@/lib/actions/auth";
import { Card, PageHeader } from "@/components/ui";
import { getCollaborationCommentsByIds, getCollaborations, getCurrentProfile } from "@/lib/data";
import type { CollaborationComment, CollaborationType, ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

const collaborationTabs: { id: CollaborationType; label: string }[] = [
  { id: "proposal", label: "Proposals" },
  { id: "contract", label: "Contracts" },
  { id: "b2b_sale", label: "B2B sales" },
];

const forumCategories = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

type CollaborateTab = CollaborationType | "forum";

const allTabs: { id: CollaborateTab; label: string }[] = [
  ...collaborationTabs,
  { id: "forum", label: "Forum" },
];

export default async function CollaboratePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; category?: string; q?: string; post?: string }>;
}) {
  const params = await searchParams;
  const tab: CollaborateTab = allTabs.some((t) => t.id === params.tab)
    ? (params.tab as CollaborateTab)
    : "proposal";
  const forumCategory = forumCategories.includes(params.category as ForumCategory)
    ? (params.category as ForumCategory)
    : undefined;
  const forumQuery = params.q ?? "";
  const selectedPostId = params.post?.trim() || undefined;
  const userId = await getAuthUserId();
  const profile = await getCurrentProfile();
  const isBusinessAccount =
    profile?.role === "business" || profile?.role === "organization";

  const collaborations =
    tab === "forum"
      ? []
      : await getCollaborations(tab as CollaborationType, userId);
  const commentsById: Map<string, CollaborationComment[]> =
    tab === "forum"
      ? new Map()
      : await getCollaborationCommentsByIds(collaborations.map((idea) => idea.id));

  function tabHref(next: CollaborateTab) {
    if (next === "proposal") return "/partnerships";
    if (next === "forum") return "/partnerships?tab=forum";
    return `/partnerships?tab=${next}`;
  }

  const isForumTab = tab === "forum";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Collaborations"
        description={
          isForumTab
            ? "Community discussions about partnerships, local tips, hiring, and more."
            : "Proposals, contracts, and B2B sales posted by local businesses and organizations."
        }
        action={
          isForumTab ? (
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
          ) : isBusinessAccount ? (
            <Link
              href={`/partnerships/new?type=${tab}`}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Create proposal
            </Link>
          ) : (
            <Link
              href="/profile/create"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Business account required
            </Link>
          )
        }
      />

      <div className="filter-scroll mb-8">
        {allTabs.map(({ id, label }) => (
          <Link
            key={id}
            href={tabHref(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === id
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {isForumTab ? (
        <ForumDiscussionsSection
          basePath="/partnerships?tab=forum"
          category={forumCategory}
          query={forumQuery}
          selectedPostId={selectedPostId}
        />
      ) : collaborations.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No shared {collaborationTabs.find((t) => t.id === tab)?.label.toLowerCase()} yet.{" "}
            <Link href={`/partnerships/new?type=${tab}`} className="text-accent hover:underline">
              Create the first one
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {collaborations.map((idea) => (
            <CollaborationProposalCard
              key={idea.id}
              idea={idea}
              comments={commentsById.get(idea.id) ?? []}
              currentUserId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
