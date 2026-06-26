import Link from "next/link";
import { CollaborationGridCard } from "@/components/collaboration-grid-card";
import { getAuthUserId } from "@/lib/actions/auth";
import { Card, PageHeader } from "@/components/ui";
import { getCollaborations, getCurrentProfile } from "@/lib/data";
import type { CollaborationType } from "@/lib/types";

const collaborationTabs: { id: CollaborationType; label: string }[] = [
  { id: "proposal", label: "Proposals" },
  { id: "contract", label: "Contracts" },
  { id: "b2b_sale", label: "B2B Sales" },
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
  // Sort by interest count descending
  const sorted = [...collaborations].sort((a, b) => (b.interestedCount ?? 0) - (a.interestedCount ?? 0));

  function tabHref(next: CollaborationType) {
    if (next === "proposal") return "/partnerships";
    return `/partnerships?tab=${next}`;
  }

  const createLabel =
    tab === "contract" ? "Create contract" :
    tab === "b2b_sale" ? "Create B2B sale" :
    "Create proposal";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Collaborations"
        description={
          tab === "b2b_sale"
            ? "B2B sales opportunities posted by local businesses and organizations."
            : tab === "contract"
            ? "Contract opportunities posted by local businesses and organizations."
            : "Proposals posted by local businesses and organizations."
        }
        action={
          isBusinessAccount ? (
            <Link
              href={`/partnerships/new?type=${tab}`}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              {createLabel}
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

      {sorted.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No {collaborationTabs.find((t) => t.id === tab)?.label.toLowerCase()} yet.{" "}
            <Link href={`/partnerships/new?type=${tab}`} className="text-accent hover:underline">
              Create the first one
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((idea) => (
            <CollaborationGridCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
