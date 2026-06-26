import Link from "next/link";
import { CollaborationProposalCard } from "@/components/collaboration-proposal-card";
import { getAuthUserId } from "@/lib/actions/auth";
import { Card, PageHeader } from "@/components/ui";
import { getCollaborationCommentsByIds, getCollaborations, getCurrentProfile } from "@/lib/data";
import type { CollaborationComment, CollaborationType } from "@/lib/types";

const collaborationTabs: { id: CollaborationType; label: string }[] = [
  { id: "proposal", label: "Proposals" },
  { id: "contract", label: "Contracts" },
  { id: "b2b_sale", label: "B2B sales" },
];

export default async function CollaboratePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: CollaborationType = collaborationTabs.some((t) => t.id === params.tab)
    ? (params.tab as CollaborationType)
    : "proposal";
  const userId = await getAuthUserId();
  const profile = await getCurrentProfile();
  const isBusinessAccount =
    profile?.role === "business" || profile?.role === "organization" || profile?.role === "marketer";

  const collaborations = await getCollaborations(tab, userId);
  const commentsById: Map<string, CollaborationComment[]> =
    await getCollaborationCommentsByIds(collaborations.map((idea) => idea.id));

  function tabHref(next: CollaborationType) {
    if (next === "proposal") return "/partnerships";
    return `/partnerships?tab=${next}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Collaborations"
        description="Proposals, contracts, and B2B sales posted by local businesses and organizations."
        action={
          isBusinessAccount ? (
            <Link
              href={`/partnerships/new?type=${tab}`}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              {tab === "contract" ? "Create contract" : tab === "b2b_sale" ? "Create B2B sale" : "Create proposal"}
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
        {collaborationTabs.map(({ id, label }) => (
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

      {collaborations.length === 0 ? (
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
