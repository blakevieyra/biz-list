import { CollaborationCard } from "@/components/collaboration-card";
import { PageHeader } from "@/components/ui";
import { getCollaborations } from "@/lib/data";
import Link from "next/link";

export default async function CollaboratePage() {
  const collaborations = await getCollaborations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Collaborate on Joint Ventures"
        description="Propose ideas for co-marketing, shared events, product bundles, and other partnerships with local businesses who want to grow together."
        action={
          <Link
            href="/collaborate/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Propose an idea
          </Link>
        }
      />

      <div className="mb-10 rounded-2xl border border-border bg-teal-50 p-6">
        <h2 className="font-semibold">How collaboration works</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-muted">
          <li>Post your joint venture idea and who you&apos;re looking for</li>
          <li>Other businesses discover it in the directory and forum</li>
          <li>Connect, comment, and explore partnerships locally</li>
        </ol>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {collaborations.map((idea) => (
          <CollaborationCard key={idea.id} idea={idea} />
        ))}
      </div>
    </div>
  );
}
