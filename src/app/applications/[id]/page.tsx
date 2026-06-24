import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JobApplicationDetail } from "@/components/job-application-detail";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessByOwnerId } from "@/lib/data";
import {
  getJobApplicationById,
  getJobApplicationComments,
} from "@/lib/data/business";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const application = await getJobApplicationById(id, userId);
  if (!application) notFound();

  const isOwner = application.ownerId === userId;
  const comments = await getJobApplicationComments(application.id, application.ownerId);
  const ownerBusiness = isOwner ? await getBusinessByOwnerId(userId) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title={isOwner ? "Applicant review" : "My application"}
        description={
          isOwner
            ? `Review and discuss this candidate for ${ownerBusiness?.name ?? "your business"}.`
            : "Your submitted resume, cover letter, and discussion thread."
        }
        action={
          <Link
            href={isOwner ? "/dashboard/applications" : "/profile?tab=applications"}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Back
          </Link>
        }
      />

      <JobApplicationDetail
        application={application}
        comments={comments}
        currentUserId={userId}
        ownerId={application.ownerId}
        isOwner={isOwner}
      />
    </div>
  );
}
