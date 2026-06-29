import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCollaborationById, getCollaborationComments, getCurrentProfile } from "@/lib/data";
import { CollaborationDetailCard } from "@/components/collaboration-detail-card";

export default async function CollaborationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getAuthUserId();
  const [idea, comments, profile] = await Promise.all([
    getCollaborationById(id, userId),
    getCollaborationComments(id),
    getCurrentProfile(),
  ]);

  if (!idea) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/partnerships" className="text-sm text-accent hover:underline">
        ← Back to collaborations
      </Link>
      <div className="mt-6">
        <CollaborationDetailCard
          idea={idea}
          comments={comments}
          currentUserId={userId}
          currentUserName={profile?.displayName ?? null}
          currentUserRole={profile?.role ?? null}
        />
      </div>
    </div>
  );
}
