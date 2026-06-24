"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateJobApplicationStatus } from "@/lib/actions/business";
import { JobApplicationComments } from "@/components/job-application-comments";
import { Card, formatPostDateTime } from "@/components/ui";
import type { JobApplication, JobApplicationComment } from "@/lib/types";

const STATUS_LABELS: Record<JobApplication["status"], string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  accepted: "Accepted",
  declined: "Declined",
};

export function JobApplicationDetail({
  application,
  comments,
  currentUserId,
  ownerId,
  isOwner,
}: {
  application: JobApplication;
  comments: JobApplicationComment[];
  currentUserId: string;
  ownerId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatus(status: "reviewed" | "accepted" | "declined") {
    startTransition(async () => {
      setError(null);
      const result = await updateJobApplicationStatus({
        applicationId: application.id,
        businessId: application.businessId,
        status,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Job application</p>
            <h1 className="mt-1 text-xl font-bold">
              {isOwner ? application.applicantName : application.businessName ?? "Business listing"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Applied {formatPostDateTime(application.createdAt)} · {STATUS_LABELS[application.status]}
            </p>
          </div>
          <Link
            href={isOwner ? `/listings/people/${application.applicantId}` : `/listings/${application.businessId}`}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            {isOwner ? "View applicant" : "View business"}
          </Link>
        </div>

        {isOwner && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(["reviewed", "accepted", "declined"] as const).map((status) => (
              <button
                key={status}
                type="button"
                disabled={pending || application.status === status}
                onClick={() => handleStatus(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                  application.status === status
                    ? "bg-accent text-white"
                    : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Cover letter</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {application.coverLetter || application.message}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Resume snapshot</h2>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-slate-50 p-3 text-sm leading-relaxed text-muted">
              {application.resumeSnapshot || "No resume saved on profile yet."}
            </pre>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      <JobApplicationComments
        applicationId={application.id}
        comments={comments}
        currentUserId={currentUserId}
      />
    </div>
  );
}
