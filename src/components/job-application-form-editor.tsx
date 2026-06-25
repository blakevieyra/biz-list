"use client";

import type { JobApplicationFormConfig, JobApplicationQuestion, JobApplicationQuestionKind } from "@/lib/types";
import { createQuestionId } from "@/lib/job-application-form";

const KIND_LABELS: Record<JobApplicationQuestionKind, string> = {
  short: "Short answer",
  legal: "Legal confirmation",
  important: "Important field",
};

export function JobApplicationFormEditor({
  form,
  onChange,
}: {
  form: JobApplicationFormConfig;
  onChange: (form: JobApplicationFormConfig) => void;
}) {
  function updateQuestion(id: string, patch: Partial<JobApplicationQuestion>) {
    onChange({
      questions: form.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    });
  }

  function removeQuestion(id: string) {
    onChange({ questions: form.questions.filter((q) => q.id !== id) });
  }

  function addQuestion(kind: JobApplicationQuestionKind) {
    onChange({
      questions: [
        ...form.questions,
        {
          id: createQuestionId(),
          kind,
          label:
            kind === "legal"
              ? "I confirm the information in this application is accurate."
              : kind === "important"
                ? "Important question for applicants"
                : "Your question for applicants",
          required: true,
          placeholder: kind === "legal" ? undefined : "Applicant answer…",
        },
      ],
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Job application questions</h3>
        <p className="mt-1 text-xs text-muted">
          Choose short-form prompts, legal confirmations, and important fields applicants must
          complete before sending their application to you.
        </p>
      </div>

      {form.questions.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">
          No custom questions yet. Default prompts are used when hiring is enabled, or add your
          own below.
        </p>
      )}

      <div className="space-y-3">
        {form.questions.map((question) => (
          <div key={question.id} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {KIND_LABELS[question.kind]}
              </span>
              <button
                type="button"
                onClick={() => removeQuestion(question.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            {question.kind === "legal" ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={question.required !== false}
                  onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                  className="mt-1"
                />
                <textarea
                  value={question.label}
                  onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                  rows={2}
                  className="min-h-[3rem] flex-1 rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="Legal confirmation text applicants must agree to"
                />
              </label>
            ) : (
              <>
                <input
                  value={question.label}
                  onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="Question label"
                />
                <input
                  value={question.placeholder ?? ""}
                  onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="Placeholder for applicant answer"
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={question.required !== false}
                    onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                  />
                  Required
                </label>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addQuestion("short")}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40"
        >
          + Short question
        </button>
        <button
          type="button"
          onClick={() => addQuestion("important")}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40"
        >
          + Important field
        </button>
        <button
          type="button"
          onClick={() => addQuestion("legal")}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40"
        >
          + Legal confirmation
        </button>
      </div>
    </div>
  );
}
