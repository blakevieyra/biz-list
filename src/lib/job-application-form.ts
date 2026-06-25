import type { BusinessProfile, JobApplicationFormConfig, JobApplicationQuestion } from "@/lib/types";

export const DEFAULT_JOB_APPLICATION_QUESTIONS: JobApplicationQuestion[] = [
  {
    id: "short-fit",
    kind: "short",
    label: "Why are you a good fit for this role?",
    required: true,
    placeholder: "Brief answer…",
  },
  {
    id: "short-start",
    kind: "short",
    label: "When can you start?",
    required: true,
    placeholder: "e.g. Immediately, two weeks…",
  },
  {
    id: "legal-work-auth",
    kind: "legal",
    label: "I am legally authorized to work in the United States.",
    required: true,
  },
  {
    id: "legal-background",
    kind: "legal",
    label: "I understand the employer may verify information provided in this application.",
    required: true,
  },
];

export function createQuestionId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyJobApplicationForm(): JobApplicationFormConfig {
  return { questions: [] };
}

export function parseJobApplicationForm(raw: unknown): JobApplicationFormConfig {
  if (!raw || typeof raw !== "object") return emptyJobApplicationForm();
  const data = raw as { questions?: unknown };
  if (!Array.isArray(data.questions)) return emptyJobApplicationForm();

  const questions: JobApplicationQuestion[] = [];
  for (const item of data.questions) {
    if (!item || typeof item !== "object") continue;
    const q = item as Partial<JobApplicationQuestion>;
    if (!q.id || !q.label || !q.kind) continue;
    if (q.kind !== "short" && q.kind !== "legal" && q.kind !== "important") continue;
    questions.push({
      id: String(q.id).slice(0, 64),
      kind: q.kind,
      label: String(q.label).slice(0, 500),
      required: q.required !== false,
      placeholder: q.placeholder ? String(q.placeholder).slice(0, 200) : undefined,
    });
  }

  return { questions: questions.slice(0, 20) };
}

export function sanitizeJobApplicationForm(
  form: JobApplicationFormConfig | undefined,
): JobApplicationFormConfig {
  return parseJobApplicationForm(form);
}

export function resolveJobApplicationForm(
  business: Pick<BusinessProfile, "jobApplicationForm" | "isHiring">,
): JobApplicationFormConfig {
  const custom = business.jobApplicationForm?.questions ?? [];
  if (custom.length > 0) {
    return { questions: custom };
  }
  if (business.isHiring) {
    return { questions: DEFAULT_JOB_APPLICATION_QUESTIONS };
  }
  return emptyJobApplicationForm();
}

export function validateApplicationAnswers(
  form: JobApplicationFormConfig,
  answers: Record<string, string>,
  resumeAttached: boolean,
): { ok: true } | { ok: false; error: string } {
  for (const question of form.questions) {
    if (!question.required) continue;
    const value = answers[question.id]?.trim() ?? "";
    if (question.kind === "legal") {
      if (value !== "yes") {
        return { ok: false, error: `Please confirm: ${question.label}` };
      }
      continue;
    }
    if (!value) {
      return { ok: false, error: `Please answer: ${question.label}` };
    }
  }

  if (!resumeAttached) {
    return { ok: false, error: "Attach your resume before submitting." };
  }

  return { ok: true };
}

export function buildApplicationSummary(
  form: JobApplicationFormConfig,
  answers: Record<string, string>,
): string {
  const lines: string[] = [];
  for (const question of form.questions) {
    if (question.kind === "legal") continue;
    const answer = answers[question.id]?.trim();
    if (!answer) continue;
    lines.push(`${question.label}\n${answer}`);
  }
  return lines.join("\n\n").slice(0, 2000);
}

export function parseFormAnswers(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") {
      result[key] = value.slice(0, 2000);
    }
  }
  return result;
}
