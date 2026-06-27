"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PageHeader, Card } from "@/components/ui";
import { runComprehensiveBusinessAudit } from "@/lib/actions/pro";
import type { ComprehensiveAuditResult, ComprehensiveAuditSection } from "@/lib/ai/ai-services";

// ─── Step definitions ────────────────────────────────────────────────────────

type Question = {
  name: string;
  label: string;
  placeholder: string;
  type: "input" | "textarea";
  required?: boolean;
};

type Step = {
  id: string;
  phase: "intro" | "internal" | "external";
  phaseLabel: string;
  label: string;
  tagline: string;
  questions: Question[];
};

const STEPS: Step[] = [
  {
    id: "basics",
    phase: "intro",
    phaseLabel: "About Your Business",
    label: "Business Overview",
    tagline: "A quick snapshot so the AI can tailor every insight to your situation.",
    questions: [
      { name: "businessName", label: "Business name", placeholder: "Your business name", type: "input", required: true },
      { name: "category", label: "Industry / category", placeholder: "e.g., Food & Beverage, Professional Services, Retail...", type: "input", required: true },
      { name: "cityState", label: "City and state", placeholder: "e.g., Austin, TX", type: "input" },
      { name: "description", label: "What does your business do? (in your own words)", placeholder: "Describe what you do, who you serve, and what makes you different...", type: "textarea", required: true },
    ],
  },
  {
    id: "operations",
    phase: "internal",
    phaseLabel: "Internal Audit",
    label: "Operations & Processes",
    tagline: "How your business runs day to day — consistency, bottlenecks, and efficiency.",
    questions: [
      { name: "opsProcesses", label: "Do you have documented processes or SOPs for key tasks?", placeholder: "e.g., Order handling, customer onboarding, quality checks. If not, describe how things get done day-to-day...", type: "textarea" },
      { name: "opsBottleneck", label: "What is your biggest operational bottleneck right now?", placeholder: "What slows you down the most — scheduling, inventory, communication, staffing?", type: "textarea" },
      { name: "opsStrength", label: "What part of your operations runs the most smoothly?", placeholder: "What would customers say you're most consistent and reliable about?", type: "textarea" },
    ],
  },
  {
    id: "finance",
    phase: "internal",
    phaseLabel: "Internal Audit",
    label: "Financial Health",
    tagline: "Revenue model, pricing strategy, and your biggest financial pressures.",
    questions: [
      { name: "finRevenue", label: "How do you generate revenue? Describe your main streams.", placeholder: "e.g., Product sales, service fees, recurring clients, events, commissions...", type: "textarea" },
      { name: "finPricing", label: "How is your pricing set and are you confident it's competitive?", placeholder: "e.g., Market rate, cost-plus, value-based — and when you last reviewed it...", type: "textarea" },
      { name: "finChallenge", label: "What is your biggest financial challenge right now?", placeholder: "e.g., Slow seasons, high overhead, late payments, underpriced services, scaling costs...", type: "textarea" },
    ],
  },
  {
    id: "team",
    phase: "internal",
    phaseLabel: "Internal Audit",
    label: "Team & Culture",
    tagline: "Your people — strengths, gaps, and the culture you're building.",
    questions: [
      { name: "teamSize", label: "How many people work in your business? Describe the structure.", placeholder: "e.g., Just me, 2 part-timers + 1 full-time, family-run with 5 staff...", type: "textarea" },
      { name: "teamStrength", label: "What are your team's greatest strengths?", placeholder: "e.g., Deep expertise, customer relationships, creative output, reliability...", type: "textarea" },
      { name: "teamGap", label: "What skills or roles are missing that would help you grow?", placeholder: "e.g., Marketing, sales, bookkeeping, project management, tech support...", type: "textarea" },
    ],
  },
  {
    id: "products",
    phase: "internal",
    phaseLabel: "Internal Audit",
    label: "Products & Services",
    tagline: "What you offer, what makes it different, and what customers tell you.",
    questions: [
      { name: "prodCore", label: "What is your core offering and what makes it different?", placeholder: "Your best product or service and why customers choose you over alternatives...", type: "textarea" },
      { name: "prodFeedback", label: "What feedback do customers give you most often?", placeholder: "Positive and negative — what do they love and what do they wish was better?", type: "textarea" },
      { name: "prodGap", label: "Is there a product or service you know you should offer but don't yet?", placeholder: "Describe the gap and what has stopped you from addressing it...", type: "textarea" },
    ],
  },
  {
    id: "market",
    phase: "external",
    phaseLabel: "External Audit",
    label: "Market & Competition",
    tagline: "Who you compete with, industry trends, and opportunities you haven't captured.",
    questions: [
      { name: "mktCompetitors", label: "Who are your 2-3 main competitors?", placeholder: "Name them and describe what they do well and where they fall short...", type: "textarea" },
      { name: "mktTrend", label: "What trend in your industry affects your business most right now?", placeholder: "e.g., Rising input costs, shift to online, new tech, regulatory change...", type: "textarea" },
      { name: "mktOpportunity", label: "What market opportunity are you not fully capturing yet?", placeholder: "e.g., An underserved customer segment, new geography, adjacent service...", type: "textarea" },
    ],
  },
  {
    id: "customers",
    phase: "external",
    phaseLabel: "External Audit",
    label: "Customers & Audience",
    tagline: "Who you serve, how they find you, and how well you keep them.",
    questions: [
      { name: "custTarget", label: "Describe your ideal customer in detail.", placeholder: "Who they are, what they care about, how they make buying decisions...", type: "textarea" },
      { name: "custAcquisition", label: "How do most new customers find you and how do you keep them?", placeholder: "e.g., Referrals, Google, social — and your retention or repeat rate...", type: "textarea" },
      { name: "custPain", label: "What problem do you solve better than anyone else?", placeholder: "In your customer's own words — what frustration or need do you address?", type: "textarea" },
    ],
  },
  {
    id: "brand",
    phase: "external",
    phaseLabel: "External Audit",
    label: "Brand & Online Presence",
    tagline: "How the world sees you — reputation, reviews, and digital footprint.",
    questions: [
      { name: "brandPercep", label: "How would a new customer describe your brand at first glance?", placeholder: "e.g., Professional, approachable, affordable, premium, local, tech-forward...", type: "textarea" },
      { name: "brandReviews", label: "What are your online reviews like overall? Any common themes?", placeholder: "e.g., 4.5 stars on Google — customers praise speed but mention wait times...", type: "textarea" },
      { name: "brandChannels", label: "Which online channels do you actively use for marketing?", placeholder: "e.g., Instagram daily, Google Business updated weekly, occasional email...", type: "textarea" },
    ],
  },
  {
    id: "growth",
    phase: "external",
    phaseLabel: "External Audit",
    label: "Growth & Partnerships",
    tagline: "Your 12-month goal, partnership opportunities, and what's in the way.",
    questions: [
      { name: "growthGoal", label: "What is your #1 growth goal for the next 12 months?", placeholder: "e.g., 50% revenue increase, open a second location, launch a product line...", type: "textarea" },
      { name: "growthPartner", label: "Are there local businesses or organizations you'd like to partner with?", placeholder: "e.g., Complementary services, community groups, vendors, referral partners...", type: "textarea" },
      { name: "growthBarrier", label: "What is the single biggest barrier to achieving that goal?", placeholder: "e.g., Capital, time, awareness, team capacity, technology, confidence...", type: "textarea" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return { ring: "border-emerald-300 bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" };
  if (score >= 55) return { ring: "border-amber-300 bg-amber-50", text: "text-amber-700", bar: "bg-amber-400" };
  return { ring: "border-red-300 bg-red-50", text: "text-red-700", bar: "bg-red-400" };
}

function ScoreCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  const c = scoreColor(value);
  return (
    <div className={`rounded-2xl border p-5 text-center ${c.ring}`}>
      <p className={`text-4xl font-bold ${c.text}`}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground/80">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function SectionCard({ section }: { section: ComprehensiveAuditSection }) {
  const c = scoreColor(section.score);
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border p-4 ${c.ring}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${c.text}`}>{section.score}</span>
          <div>
            <p className="font-semibold">{section.label}</p>
            <p className="text-xs text-muted">{section.summary}</p>
          </div>
        </div>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
            <ul className="space-y-1">
              {section.strengths.map((s) => (
                <li key={s} className="text-sm text-muted">• {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-600">Gaps & Risks</p>
            <ul className="space-y-1">
              {section.gaps.map((g) => (
                <li key={g} className="text-sm text-muted">• {g}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent">Action Items</p>
            <ul className="space-y-1">
              {section.actions.map((a) => (
                <li key={a} className="text-sm text-muted">→ {a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AuditClient({ initialValues = {} }: { initialValues?: Record<string, string> }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [result, setResult] = useState<ComprehensiveAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const internalSteps = STEPS.filter((s) => s.phase === "internal");
  const externalSteps = STEPS.filter((s) => s.phase === "external");

  function handleChange(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleNext() {
    const missing = current.questions.find((q) => q.required && !values[q.name]?.trim());
    if (missing) {
      setError(`"${missing.label}" is required.`);
      return;
    }
    setError(null);
    if (isLast) {
      generate();
    } else {
      setStep((s) => s + 1);
    }
  }

  function generate() {
    startTransition(async () => {
      setError(null);
      const res = await runComprehensiveBusinessAudit(values);
      if (res.error) { setError(res.error); return; }
      if (res.result) setResult(res.result);
    });
  }

  // ── Report view ─────────────────────────────────────────────────────────────
  if (result) {
    const internalSections = result.sections.filter((s) => s.phase === "internal");
    const externalSections = result.sections.filter((s) => s.phase === "external");

    return (
      <>
        <PageHeader
          title="Business Audit Report"
          description={`${values.businessName ?? "Your business"} · Full internal & external audit`}
          action={
            <button
              type="button"
              onClick={() => { setResult(null); setStep(0); setValues({}); }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Start new audit
            </button>
          }
        />

        {/* Scores */}
        <div className="grid gap-4 sm:grid-cols-3">
          <ScoreCard label="Overall Score" value={result.overallScore} sub="Weighted average" />
          <ScoreCard label="Internal Health" value={result.internalScore} sub="Operations · Finance · Team · Products" />
          <ScoreCard label="External Positioning" value={result.externalScore} sub="Market · Customers · Brand · Growth" />
        </div>

        {/* Executive summary */}
        <Card className="mt-6">
          <h2 className="font-semibold">Executive Summary</h2>
          <p className="mt-2 leading-relaxed text-muted">{result.executiveSummary}</p>
        </Card>

        {/* Priority actions */}
        <Card className="mt-4">
          <h2 className="font-semibold">Priority Action Plan</h2>
          <p className="mt-1 text-sm text-muted">Ranked by impact — tackle high-priority items first.</p>
          <div className="mt-4 space-y-3">
            {result.priorityActions.map((a, i) => (
              <div key={i} className="flex flex-col gap-1 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PRIORITY_COLORS[a.priority]}`}>
                    {a.priority}
                  </span>
                  <span className="text-xs text-muted">{a.category}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{a.action}</p>
                  <p className="mt-0.5 text-sm text-muted">{a.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Internal breakdown */}
        <div className="mt-4">
          <h2 className="mb-3 font-semibold text-foreground/70">Internal Audit — click any section to expand</h2>
          <div className="space-y-3">
            {internalSections.map((s) => <SectionCard key={s.id} section={s} />)}
          </div>
        </div>

        {/* External breakdown */}
        <div className="mt-6">
          <h2 className="mb-3 font-semibold text-foreground/70">External Audit — click any section to expand</h2>
          <div className="space-y-3">
            {externalSections.map((s) => <SectionCard key={s.id} section={s} />)}
          </div>
        </div>

        <Link href="/dashboard" className="mt-8 inline-block text-sm text-accent hover:underline">
          ← Back to dashboard
        </Link>
      </>
    );
  }

  // ── Wizard view ──────────────────────────────────────────────────────────────
  const phaseLabel =
    current.phase === "intro"
      ? null
      : current.phase === "internal"
      ? "Internal Audit"
      : "External Audit";

  const phaseSteps = current.phase === "internal" ? internalSteps : current.phase === "external" ? externalSteps : [];
  const phaseIndex = phaseSteps.findIndex((s) => s.id === current.id);

  return (
    <>
      <PageHeader
        title="AI Business Audit"
        description="A structured internal + external audit that prepares you with a full analysis and priority action plan."
      />

      {/* Phase + progress */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Phase pills */}
        <div className="flex gap-2">
          {(["intro", "internal", "external"] as const).map((ph) => {
            const active = current.phase === ph;
            const done =
              ph === "intro"
                ? step > 0
                : ph === "internal"
                ? step > 4
                : false;
            return (
              <span
                key={ph}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-muted"
                }`}
              >
                {ph === "intro" ? "Overview" : ph === "internal" ? "Internal Audit" : "External Audit"}
              </span>
            );
          })}
        </div>

        {/* Step dots within current phase */}
        {phaseSteps.length > 0 && (
          <div className="flex gap-1.5">
            {phaseSteps.map((s, i) => (
              <span
                key={s.id}
                className={`h-2 w-2 rounded-full ${
                  i < phaseIndex ? "bg-accent/60" : i === phaseIndex ? "bg-accent" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        )}

        <span className="text-xs text-muted">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>

      <Card>
        {/* Step header */}
        {phaseLabel && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">{phaseLabel}</p>
        )}
        <h2 className="text-xl font-bold">{current.label}</h2>
        <p className="mt-1 text-sm text-muted">{current.tagline}</p>
        {step === 0 && Object.keys(initialValues).length > 0 && (
          <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-accent">
            Pre-filled from your business profile — review and edit anything that needs updating.
          </p>
        )}

        {/* Questions */}
        <div className="mt-6 space-y-5">
          {current.questions.map((q) =>
            q.type === "textarea" ? (
              <label key={q.name} className="block text-sm">
                <span className="font-medium">
                  {q.label}
                  {q.required && <span className="ml-1 text-accent">*</span>}
                </span>
                <textarea
                  name={q.name}
                  rows={3}
                  placeholder={q.placeholder}
                  value={values[q.name] ?? ""}
                  onChange={(e) => handleChange(q.name, e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
            ) : (
              <label key={q.name} className="block text-sm">
                <span className="font-medium">
                  {q.label}
                  {q.required && <span className="ml-1 text-accent">*</span>}
                </span>
                <input
                  name={q.name}
                  placeholder={q.placeholder}
                  value={values[q.name] ?? ""}
                  onChange={(e) => handleChange(q.name, e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
            ),
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => { setError(null); setStep((s) => s - 1); }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              ← Back
            </button>
          ) : (
            <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
              ← Dashboard
            </Link>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={handleNext}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending
              ? "Generating report…"
              : isLast
              ? "Generate Full Report →"
              : "Next →"}
          </button>
        </div>
      </Card>

      {/* Section overview */}
      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.filter((s) => s.phase !== "intro").map((s, i) => {
          const globalIdx = i + 1;
          const done = step > globalIdx;
          const active = step === globalIdx;
          return (
            <div
              key={s.id}
              className={`rounded-xl border p-3 text-sm transition-colors ${
                active
                  ? "border-accent/40 bg-accent/5"
                  : done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-border bg-background text-muted"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${s.phase === "internal" ? "text-blue-600" : "text-violet-600"}`}>
                {s.phase === "internal" ? "Internal" : "External"}
              </p>
              <p className={`mt-0.5 font-medium ${active ? "text-accent" : done ? "text-emerald-700" : ""}`}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
