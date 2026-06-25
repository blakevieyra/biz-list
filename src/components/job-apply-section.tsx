"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { submitJobApplication } from "@/lib/actions/business";
import { formatPostDateTime } from "@/components/ui";
import {
  buildApplicationSummary,
  resolveJobApplicationForm,
  validateApplicationAnswers,
} from "@/lib/job-application-form";
import type { BusinessProfile, JobApplication, JobApplicationQuestion } from "@/lib/types";

function groupQuestions(questions: JobApplicationQuestion[]) {
  return {
    short: questions.filter((q) => q.kind === "short"),
    important: questions.filter((q) => q.kind === "important"),
    legal: questions.filter((q) => q.kind === "legal"),
  };
}

export function JobApplySection({
  businessId,
  businessName,
  business,
  isHiring,
  currentUserId,
  isOwner,
  resumePreview,
  existingApplication,
  compact = false,
}: {
  businessId: string;
  businessName: string;
  business: Pick<BusinessProfile, "jobApplicationForm" | "isHiring">;
  isHiring: boolean;
  currentUserId: string | null;
  isOwner: boolean;
  resumePreview?: string;
  existingApplication?: JobApplication | null;
  compact?: boolean;
}) {
  const formConfig = useMemo(() => resolveJobApplicationForm(business), [business]);
  const groups = useMemo(() => groupQuestions(formConfig.questions), [formConfig.questions]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resumeAttached, setResumeAttached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isHiring || isOwner) return null;

  const shellClass = compact
    ? "h-full rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
    : "rounded-xl border border-emerald-200 bg-emerald-50/50 p-4";

  if (existingApplication) {
    return (
      <div className={shellClass}>
        <h3 className="text-sm font-semibold text-emerald-900">Application sent</h3>
        <p className="mt-1 text-xs text-emerald-800/80">
          Applied {formatPostDateTime(existingApplication.createdAt)}.
        </p>
        <Link
          href={`/applications/${existingApplication.id}`}
          className="mt-3 inline-block text-xs font-medium text-accent hover:underline"
        >
          View thread →
        </Link>
      </div>
    );
  }

  if (successId) {
    return (
      <div className={shellClass}>
        <h3 className="text-sm font-semibold text-emerald-900">Application sent</h3>
        <p className="mt-1 text-xs text-emerald-800/80">
          Your answers and resume were sent to the business owner.
        </p>
        <Link
          href={`/applications/${successId}`}
          className="mt-3 inline-block text-xs font-medium text-accent hover:underline"
        >
          Open application thread →
        </Link>
      </div>
    );
  }

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleAttachResume() {
    if (!currentUserId) {
      window.location.href = "/auth/login";
      return;
    }
    if (!resumePreview?.trim()) {
      setError("Add a resume in My profile before attaching.");
      return;
    }
    setResumeAttached(true);
    setError(null);
  }

  function handleApply() {
    if (!currentUserId) {
      window.location.href = "/auth/login";
      return;
    }

    const validation = validateApplicationAnswers(formConfig, answers, resumeAttached);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    startTransition(async () => {
      setError(null);
      const summary = buildApplicationSummary(formConfig, answers);
      const result = await submitJobApplication({
        businessId,
        coverLetter: summary,
        formAnswers: answers,
        resumeAttached,
      });
      if (result.error) {
        setError(result.error);
        if ("applicationId" in result && result.applicationId) {
          setSuccessId(result.applicationId);
        }
        return;
      }
      setSuccessId(result.applicationId ?? null);
      setAnswers({});
      setResumeAttached(false);
    });
  }

  return (
    <div className={shellClass} id="apply">
      <h3 className="text-sm font-semibold text-emerald-900">Apply at {businessName}</h3>
      <p className="mt-1 text-xs text-emerald-800/80">
        Complete the questions below, attach your resume, and send once to the owner.
      </p>

      {!currentUserId && (
        <p className="mt-2 text-xs text-muted">
          <Link href="/auth/login" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to apply.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {groups.short.length > 0 && (
          <div className="space-y-2">
            {groups.short.map((question) => (
              <label key={question.id} className="block text-xs">
                <span className="font-medium text-foreground">{question.label}</span>
                <input
                  value={answers[question.id] ?? ""}
                  onChange={(e) => setAnswer(question.id, e.target.value)}
                  placeholder={question.placeholder}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
        )}

        {groups.important.length > 0 && (
          <div className="space-y-2 border-t border-emerald-200/80 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/70">
              Important
            </p>
            {groups.important.map((question) => (
              <label key={question.id} className="block text-xs">
                <span className="font-medium text-foreground">{question.label}</span>
                <input
                  value={answers[question.id] ?? ""}
                  onChange={(e) => setAnswer(question.id, e.target.value)}
                  placeholder={question.placeholder}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
        )}

        {groups.legal.length > 0 && (
          <div className="space-y-2 border-t border-emerald-200/80 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/70">
              Legal
            </p>
            {groups.legal.map((question) => (
              <label key={question.id} className="flex items-start gap-2 text-xs leading-snug">
                <input
                  type="checkbox"
                  checked={answers[question.id] === "yes"}
                  onChange={(e) => setAnswer(question.id, e.target.checked ? "yes" : "")}
                  className="mt-0.5"
                />
                <span>{question.label}</span>
              </label>
            ))}
          </div>
        )}

        <div className="border-t border-emerald-200/80 pt-3">
          <button
            type="button"
            onClick={handleAttachResume}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              resumeAttached
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-border bg-white text-foreground hover:border-accent/40"
            }`}
          >
            {resumeAttached ? "Resume attached" : "Attach resume"}
          </button>
          {resumeAttached && resumePreview && (
            <p className="mt-2 line-clamp-2 text-[11px] text-muted">{resumePreview}</p>
          )}
          {!resumePreview && currentUserId && (
            <Link href="/profile" className="mt-2 inline-block text-[11px] text-accent hover:underline">
              Add resume in My profile →
            </Link>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={handleApply}
        className="mt-4 w-full rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send to owner"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">
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
