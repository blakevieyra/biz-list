import Link from "next/link";
import { notFound } from "next/navigation";
import { CollaborationProposalCard } from "@/components/collaboration-proposal-card";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCollaborationById, getCollaborationComments } from "@/lib/data";

export default async function CollaborationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [idea, userId, comments] = await Promise.all([
    getCollaborationById(id),
    getAuthUserId(),
    getCollaborationComments(id),
  ]);

  if (!idea) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/partnerships" className="text-sm text-accent hover:underline">
        ← Back to collaborations
      </Link>
      <div className="mt-6">
        <CollaborationProposalCard
          idea={idea}
          comments={comments}
          currentUserId={userId}
        />
      </div>
    </div>
  );
}
