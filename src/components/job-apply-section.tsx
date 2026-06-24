"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitJobApplication } from "@/lib/actions/business";
import { formatPostDateTime } from "@/components/ui";
import type { JobApplication } from "@/lib/types";

export function JobApplySection({
  businessId,
  businessName,
  isHiring,
  currentUserId,
  isOwner,
  resumePreview,
  existingApplication,
}: {
  businessId: string;
  businessName: string;
  isHiring: boolean;
  currentUserId: string | null;
  isOwner: boolean;
  resumePreview?: string;
  existingApplication?: JobApplication | null;
}) {
  const [coverLetter, setCoverLetter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isHiring || isOwner) return null;

  if (existingApplication) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <h3 className="font-semibold text-emerald-900">Application sent</h3>
        <p className="mt-1 text-sm text-emerald-800/80">
          You applied on {formatPostDateTime(existingApplication.createdAt)}. Each business accepts
          one application per person.
        </p>
        <Link
          href={`/applications/${existingApplication.id}`}
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          View application thread →
        </Link>
      </div>
    );
  }

  function handleApply() {
    if (!currentUserId) {
      window.location.href = "/auth/login";
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await submitJobApplication({ businessId, coverLetter });
      if (result.error) {
        setError(result.error);
        if ("applicationId" in result && result.applicationId) {
          setSuccessId(result.applicationId);
        }
        return;
      }
      setSuccessId(result.applicationId ?? null);
      setCoverLetter("");
    });
  }

  if (successId) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <h3 className="font-semibold text-emerald-900">Application sent</h3>
        <p className="mt-1 text-sm text-emerald-800/80">
          Your resume and cover letter were submitted once. Track updates in your profile.
        </p>
        <Link
          href={`/applications/${successId}`}
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          Open application thread →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <h3 className="font-semibold text-emerald-900">Apply at {businessName}</h3>
      <p className="mt-1 text-sm text-emerald-800/80">
        Your saved resume is attached automatically. Add a short cover letter and submit once.
      </p>
      {!currentUserId && (
        <p className="mt-2 text-sm text-muted">
          <Link href="/auth/login" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/profile" className="text-accent hover:underline">
            complete your job seeker profile
          </Link>{" "}
          first.
        </p>
      )}
      {resumePreview && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Resume preview</p>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-white p-3 text-xs leading-relaxed text-muted">
            {resumePreview}
          </pre>
          <Link href="/profile" className="mt-2 inline-block text-xs text-accent hover:underline">
            Update resume in My profile →
          </Link>
        </div>
      )}
      <label className="mt-3 block text-sm">
        <span className="font-medium">Cover letter</span>
        <textarea
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={4}
          placeholder="Why you're a good fit and when you can start..."
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        disabled={pending || !coverLetter.trim()}
        onClick={handleApply}
        className="mt-3 min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Sending..." : "Submit application once"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
          {successId && (
            <>
              {" "}
              <Link href={`/applications/${successId}`} className="underline">
                View application
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
