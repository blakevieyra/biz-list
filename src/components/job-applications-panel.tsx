"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateJobApplicationStatus } from "@/lib/actions/business";
import { Card, formatPostDateTime } from "@/components/ui";
import type { JobApplication } from "@/lib/types";

const STATUS_LABELS: Record<JobApplication["status"], string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  accepted: "Accepted",
  declined: "Declined",
};

export function JobApplicationsPanel({
  applications,
  businessId,
}: {
  applications: JobApplication[];
  businessId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatus(
    applicationId: string,
    status: "reviewed" | "accepted" | "declined",
  ) {
    setError(null);
    startTransition(async () => {
      const result = await updateJobApplicationStatus({ applicationId, businessId, status });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!applications.length) {
    return (
      <Card>
        <h2 className="font-semibold">Job applications</h2>
        <p className="mt-2 text-sm text-muted">No applications yet. Mark your listing as hiring to receive them.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-semibold">Job applications ({applications.length})</h2>
      <p className="mt-1 text-sm text-muted">Review candidates and discuss each application in its thread.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <ul className="mt-4 space-y-4">
        {applications.map((application) => (
          <li key={application.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/listings/people/${application.applicantId}`}
                  className="font-medium text-accent hover:underline"
                >
                  {application.applicantName}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {STATUS_LABELS[application.status]} · Applied {formatPostDateTime(application.createdAt)}
                </p>
              </div>
              <Link
                href={`/applications/${application.id}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                Open thread →
              </Link>
            </div>
            <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-muted">
              {application.coverLetter || application.message}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["reviewed", "accepted", "declined"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={pending || application.status === status}
                  onClick={() => handleStatus(application.id, status)}
                  className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                    application.status === status
                      ? "bg-accent text-white"
                      : "border border-border text-muted hover:text-foreground"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
