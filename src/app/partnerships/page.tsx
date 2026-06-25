import Link from "next/link";
import { CollaborationProposalCard } from "@/components/collaboration-proposal-card";
import { getAuthUserId } from "@/lib/actions/auth";
import { Card, PageHeader } from "@/components/ui";
import { getCollaborationComments, getCollaborations } from "@/lib/data";
import type { CollaborationType } from "@/lib/types";

const tabs: { id: CollaborationType; label: string }[] = [
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
  const tab: CollaborationType = tabs.some((t) => t.id === params.tab)
    ? (params.tab as CollaborationType)
    : "proposal";
  const userId = await getAuthUserId();

  const collaborations = await getCollaborations(tab);
  const commentsById = new Map(
    await Promise.all(
      collaborations.map(async (idea) => [
        idea.id,
        await getCollaborationComments(idea.id),
      ] as const),
    ),
  );

  function tabHref(next: CollaborationType) {
    return next === "proposal" ? "/partnerships" : `/partnerships?tab=${next}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Collaborations"
        description="Share proposals, contracts, and B2B sales opportunities with local businesses."
        action={
          <Link
            href={`/partnerships/new?type=${tab}`}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Create proposal
          </Link>
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {tabs.map(({ id, label }) => (
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
            No shared {tabs.find((t) => t.id === tab)?.label.toLowerCase()} yet.{" "}
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
