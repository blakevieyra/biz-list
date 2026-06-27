"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { submitJobApplication } from "@/lib/actions/business";
import { uploadResumeFile } from "@/lib/actions/upload";
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

type ResumeMode = "none" | "picker" | "profile" | "file";

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
  const [resumeMode, setResumeMode] = useState<ResumeMode>("none");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeFileUrl, setResumeFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resumeAttached =
    (resumeMode === "profile" && !!resumePreview?.trim()) ||
    (resumeMode === "file" && !!resumeFileUrl);

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

  const handleFile = useCallback(async (file: File) => {
    const allowed = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    if (!allowed.has(file.type)) {
      setError("Upload a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Resume must be 5 MB or smaller.");
      return;
    }
    setError(null);
    setResumeFile(file);
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadResumeFile(fd);

    setUploading(false);
    if (result.error) {
      setError(result.error);
      setResumeFile(null);
      return;
    }
    setResumeFileUrl(result.url ?? null);
    setResumeMode("file");
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleAttachClick() {
    if (!currentUserId) { window.location.href = "/auth/login"; return; }
    setResumeMode("picker");
    setError(null);
  }

  function handleUseProfile() {
    if (!resumePreview?.trim()) {
      setError("Add resume text in My profile first.");
      return;
    }
    setResumeMode("profile");
    setError(null);
  }

  function handleRemove() {
    setResumeMode("none");
    setResumeFile(null);
    setResumeFileUrl(null);
    setError(null);
  }

  function handleApply() {
    if (!currentUserId) { window.location.href = "/auth/login"; return; }

    const validation = validateApplicationAnswers(formConfig, answers, resumeAttached);
    if (!validation.ok) { setError(validation.error); return; }

    startTransition(async () => {
      setError(null);
      const summary = buildApplicationSummary(formConfig, answers);
      const result = await submitJobApplication({
        businessId,
        coverLetter: summary,
        formAnswers: answers,
        resumeAttached,
        resumeFileUrl: resumeFileUrl ?? undefined,
      });
      if (result.error) {
        setError(result.error);
        if ("applicationId" in result && result.applicationId) setSuccessId(result.applicationId);
        return;
      }
      setSuccessId(result.applicationId ?? null);
      setAnswers({});
      setResumeMode("none");
      setResumeFile(null);
      setResumeFileUrl(null);
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
          <Link href="/auth/login" className="text-accent hover:underline">Sign in</Link>{" "}
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/70">Legal</p>
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

        {/* ── Resume section ──────────────────────────────────── */}
        <div className="border-t border-emerald-200/80 pt-3">

          {/* Attached: profile resume */}
          {resumeMode === "profile" && (
            <div className="rounded-lg border border-emerald-300 bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600">✓</span>
                  <span className="text-xs font-medium text-emerald-700">Profile resume attached</span>
                </div>
                <button type="button" onClick={handleRemove} className="text-[11px] text-muted hover:text-foreground">Remove</button>
              </div>
              {resumePreview && (
                <p className="mt-2 line-clamp-2 text-[11px] text-muted">{resumePreview}</p>
              )}
            </div>
          )}

          {/* Attached: uploaded file */}
          {resumeMode === "file" && resumeFile && (
            <div className="rounded-lg border border-emerald-300 bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <div>
                    <p className="text-xs font-medium text-emerald-700">{resumeFile.name}</p>
                    <p className="text-[11px] text-muted">{(resumeFile.size / 1024).toFixed(0)} KB · uploaded</p>
                  </div>
                </div>
                <button type="button" onClick={handleRemove} className="text-[11px] text-muted hover:text-foreground">Remove</button>
              </div>
            </div>
          )}

          {/* Picker: choose method */}
          {resumeMode === "picker" && (
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-foreground">Attach resume</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {/* Option A: use saved profile resume */}
                <button
                  type="button"
                  onClick={handleUseProfile}
                  disabled={!resumePreview?.trim()}
                  className="flex flex-col items-start gap-1 rounded-lg border border-border bg-slate-50 p-3 text-left text-xs transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-40"
                >
                  <span className="text-base">👤</span>
                  <span className="font-medium">Use saved resume</span>
                  <span className="text-muted">
                    {resumePreview?.trim() ? "From your BizList profile" : "No resume on profile yet"}
                  </span>
                </button>

                {/* Option B: upload file */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-start gap-1 rounded-lg border border-border bg-slate-50 p-3 text-left text-xs transition hover:border-accent/40 hover:bg-accent/5"
                >
                  <span className="text-base">📁</span>
                  <span className="font-medium">Upload a file</span>
                  <span className="text-muted">PDF, DOC, or DOCX · max 5 MB</span>
                </button>
              </div>

              {/* Drag & drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${
                  dragOver ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                }`}
              >
                {uploading ? (
                  <p className="text-xs text-muted">Uploading…</p>
                ) : (
                  <>
                    <p className="text-xs font-medium">Drag & drop your resume here</p>
                    <p className="mt-0.5 text-[11px] text-muted">or click to browse</p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleInputChange}
              />

              <button
                type="button"
                onClick={() => setResumeMode("none")}
                className="mt-2 text-[11px] text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Default: attach button */}
          {resumeMode === "none" && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAttachClick}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40"
              >
                Attach resume
              </button>
              {!resumePreview && currentUserId && (
                <Link href="/profile" className="text-[11px] text-accent hover:underline">
                  Add resume to profile →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={pending || uploading}
        onClick={handleApply}
        className="mt-4 w-full rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send to owner"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
          {successId && (
            <>{" "}<Link href={`/applications/${successId}`} className="underline">View application</Link></>
          )}
        </p>
      )}
    </div>
  );
}
