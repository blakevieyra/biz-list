"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, Card } from "@/components/ui";
import type { ComprehensiveAuditResult, ComprehensiveAuditSection } from "@/lib/ai/ai-services";

export type AuditProfileData = {
  businessName: string;
  category: string;
  cityState: string;
  description: string;
  tagline: string;
  website: string;
  phone: string;
  hours: string;
  isHiring: boolean;
  services: { name: string; price?: string }[];
};

export type PastAudit = {
  id: string;
  businessName: string;
  overallScore: number;
  createdAt: string;
  result: ComprehensiveAuditResult;
};

// ─── Step definitions ─────────────────────────────────────────────────────────

type StepDef = { icon: string; label: string; phase: "research" | "generate" };
const STEPS: StepDef[] = [
  { icon: "🔍", label: "Searching for website & social profiles", phase: "research" },
  { icon: "⭐", label: "Finding reviews & reputation signals", phase: "research" },
  { icon: "📊", label: "Identifying local competitors", phase: "research" },
  { icon: "📈", label: "Analyzing industry trends & customers", phase: "research" },
  { icon: "👥", label: "Profiling customer base & opportunities", phase: "generate" },
  { icon: "🧠", label: "Scoring all 8 audit sections", phase: "generate" },
  { icon: "📝", label: "Writing comprehensive report", phase: "generate" },
];

type StepState = "waiting" | "searching" | "found" | "analyzing";
type StepInfo = { state: StepState; finding?: string };

const MONTHLY_LIMIT = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return { ring: "border-emerald-300 bg-emerald-50", text: "text-emerald-700" };
  if (score >= 55) return { ring: "border-amber-300 bg-amber-50", text: "text-amber-700" };
  return { ring: "border-red-300 bg-red-50", text: "text-red-700" };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ScoreCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  const c = scoreColor(value);
  return (
    <div className={`rounded-2xl border p-5 text-center ${c.ring}`}>
      <p className={`text-3xl font-bold sm:text-4xl ${c.text}`}>{value}</p>
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
        <span className="shrink-0 text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
            <ul className="space-y-1">
              {section.strengths.map((s) => <li key={s} className="text-sm text-muted">• {s}</li>)}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-600">Gaps & Risks</p>
            <ul className="space-y-1">
              {section.gaps.map((g) => <li key={g} className="text-sm text-muted">• {g}</li>)}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent">Action Items</p>
            <ul className="space-y-1">
              {section.actions.map((a) => <li key={a} className="text-sm text-muted">→ {a}</li>)}
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

// ─── Report view (shared between new result + historical) ─────────────────────

function ReportView({
  result,
  businessName,
  onBack,
  backLabel,
}: {
  result: ComprehensiveAuditResult;
  businessName: string;
  onBack: () => void;
  backLabel: string;
}) {
  const internalSections = result.sections.filter((s) => s.phase === "internal");
  const externalSections = result.sections.filter((s) => s.phase === "external");

  return (
    <>
      <PageHeader
        title="Business Audit Report"
        description={`${businessName} · Full internal & external AI audit`}
        action={
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            {backLabel}
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <ScoreCard label="Overall Score" value={result.overallScore} sub="Weighted average" />
        <ScoreCard label="Internal Health" value={result.internalScore} sub="Operations · Finance · Team · Products" />
        <ScoreCard label="External Positioning" value={result.externalScore} sub="Market · Customers · Brand · Growth" />
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold">Executive Summary</h2>
        <p className="mt-2 leading-relaxed text-muted">{result.executiveSummary}</p>
      </Card>

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

      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-foreground/70">Internal Audit — tap any section to expand</h2>
        <div className="space-y-3">
          {internalSections.map((s) => <SectionCard key={s.id} section={s} />)}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-foreground/70">External Audit — tap any section to expand</h2>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function AuditClient({
  profile,
  pastAudits = [],
  auditsThisMonth: initialUsed = 0,
}: {
  profile: AuditProfileData;
  pastAudits?: PastAudit[];
  auditsThisMonth?: number;
}) {
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [category, setCategory] = useState(profile.category);
  const [cityState, setCityState] = useState(profile.cityState);
  const [description, setDescription] = useState(profile.description);

  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepInfo[]>(STEPS.map(() => ({ state: "waiting" })));
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<ComprehensiveAuditResult | null>(null);
  const [viewingAudit, setViewingAudit] = useState<PastAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedThisMonth, setUsedThisMonth] = useState(initialUsed);

  function setStep(i: number, info: Partial<StepInfo>) {
    setSteps((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...info };
      return next;
    });
  }

  async function handleRun() {
    if (!businessName.trim() || !category.trim()) {
      setError("Business name and category are required.");
      return;
    }
    if (usedThisMonth >= MONTHLY_LIMIT) {
      setError(`You've used all ${MONTHLY_LIMIT} audits for this month. Your limit resets on the 1st.`);
      return;
    }
    setError(null);
    setRunning(true);
    setSteps(STEPS.map(() => ({ state: "waiting" })));
    setActiveStep(0);

    const research: Record<string, string> = {};

    // ── Phase 1: Streaming web research (steps 0-3) ──────────────────────────
    try {
      const streamRes = await fetch("/api/audit/research-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: businessName.trim(), category: category.trim(), cityState: cityState.trim() }),
      });

      if (streamRes.ok && streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const ev = JSON.parse(raw) as {
                step?: number;
                status?: "searching" | "found";
                finding?: string;
                done?: boolean;
                research?: Record<string, string>;
              };

              if (ev.done && ev.research) {
                Object.assign(research, ev.research);
              } else if (typeof ev.step === "number") {
                if (ev.status === "searching") {
                  setActiveStep(ev.step);
                  setStep(ev.step, { state: "searching" });
                } else if (ev.status === "found") {
                  setStep(ev.step, { state: "found", finding: ev.finding });
                }
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch {
      // Research failed — continue to generate with profile data only
    }

    // ── Phase 2: Generate report (steps 4-6) ─────────────────────────────────
    for (let i = 4; i <= 6; i++) {
      setActiveStep(i);
      setStep(i, { state: "analyzing" });
      if (i < 6) await new Promise((r) => setTimeout(r, 4000));
    }

    try {
      const genRes = await fetch("/api/audit/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            businessName: businessName.trim(),
            category: category.trim(),
            cityState: cityState.trim(),
            description: description.trim(),
            tagline: profile.tagline,
            website: profile.website,
            phone: profile.phone,
            hours: profile.hours,
            isHiring: profile.isHiring,
            services: profile.services,
          },
          research,
        }),
      });

      const genData = (await genRes.json()) as {
        result?: ComprehensiveAuditResult;
        error?: string;
        limitReached?: boolean;
        auditsThisMonth?: number;
        monthlyLimit?: number;
      };

      if (genData.auditsThisMonth !== undefined) {
        setUsedThisMonth(genData.auditsThisMonth);
      }

      if (!genRes.ok || genData.error) {
        setError(genData.error ?? "Report generation failed. Please try again.");
        setRunning(false);
        return;
      }

      if (genData.result) {
        setStep(6, { state: "found", finding: "Report complete" });
        await new Promise((r) => setTimeout(r, 600));
        setResult(genData.result);
      }
    } catch {
      setError("Report generation failed. Check your connection and try again.");
    } finally {
      setRunning(false);
    }
  }

  // ── Viewing a past report ─────────────────────────────────────────────────────
  if (viewingAudit) {
    return (
      <ReportView
        result={viewingAudit.result}
        businessName={viewingAudit.businessName}
        onBack={() => setViewingAudit(null)}
        backLabel="← Audit history"
      />
    );
  }

  // ── Viewing a just-completed report ──────────────────────────────────────────
  if (result) {
    return (
      <ReportView
        result={result}
        businessName={businessName}
        onBack={() => { setResult(null); setError(null); setSteps(STEPS.map(() => ({ state: "waiting" }))); }}
        backLabel="Run new audit"
      />
    );
  }

  // ── Progress view ─────────────────────────────────────────────────────────────
  if (running) {
    const researchDone = steps.slice(0, 4).every((s) => s.state === "found");
    return (
      <>
        <PageHeader title="AI Business Audit" description={`Analyzing ${businessName}…`} />
        <Card>
          <div className="pb-6 pt-2 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <h2 className="text-lg font-bold">Running full AI audit</h2>
            <p className="mt-1 text-sm text-muted">
              {!researchDone
                ? "Searching the web for live data about your business…"
                : "Analyzing all 8 sections and writing your report…"}
            </p>
          </div>

          <div className="space-y-2">
            {STEPS.map((step, i) => {
              const info = steps[i];
              const isActive = i === activeStep && running;
              const isDone = info.state === "found";
              const isSearching = info.state === "searching" || info.state === "analyzing";
              const isWaiting = info.state === "waiting";

              return (
                <div
                  key={i}
                  className={`rounded-xl px-4 py-3 transition-all duration-500 ${
                    isActive || isSearching
                      ? "border border-accent/30 bg-accent/5"
                      : isDone
                      ? "bg-emerald-50/70"
                      : isWaiting
                      ? "opacity-25"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{step.icon}</span>
                    <span className={`flex-1 text-sm font-medium ${isDone ? "text-emerald-700" : isActive || isSearching ? "text-foreground" : "text-muted"}`}>
                      {step.label}
                    </span>
                    {(isActive || isSearching) && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    )}
                    {isDone && <span className="text-sm font-medium text-emerald-600">✓</span>}
                  </div>

                  {isDone && info.finding && info.finding !== "Report complete" && (
                    <p className="mt-1.5 ml-8 rounded-lg bg-white/70 px-3 py-1.5 text-xs text-muted ring-1 ring-emerald-200">
                      <span className="font-medium text-emerald-700">Found: </span>
                      {info.finding}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2 border-t border-border pt-4">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${!researchDone ? "bg-accent text-white" : "bg-emerald-100 text-emerald-700"}`}>
              {!researchDone ? "● " : "✓ "}Web Research
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${researchDone ? "bg-accent text-white" : "bg-slate-100 text-muted"}`}>
              {researchDone ? "● " : ""}AI Analysis
            </span>
          </div>
        </Card>
      </>
    );
  }

  // ── Setup / landing view ──────────────────────────────────────────────────────
  const remaining = MONTHLY_LIMIT - usedThisMonth;
  const atLimit = remaining <= 0;

  return (
    <>
      <PageHeader
        title="AI Business Audit"
        description="One click — the AI researches your business live and delivers a full scored audit with action plans."
      />

      {/* Monthly usage meter */}
      <div className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
        atLimit
          ? "border-red-200 bg-red-50"
          : remaining <= 1
          ? "border-amber-200 bg-amber-50"
          : "border-border bg-card"
      }`}>
        <span className={atLimit ? "font-medium text-red-700" : remaining <= 1 ? "font-medium text-amber-700" : "text-muted"}>
          {atLimit
            ? "Monthly audit limit reached — resets on the 1st"
            : `${remaining} of ${MONTHLY_LIMIT} audits remaining this month`}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: MONTHLY_LIMIT }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${i < usedThisMonth ? "bg-accent" : "bg-slate-200"}`}
            />
          ))}
        </div>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xl">🤖</div>
          <div>
            <p className="font-semibold">Fully automated audit</p>
            <p className="mt-0.5 text-sm text-muted">
              The AI searches the web step by step — finding your social profiles, reviews, competitors, and industry trends — then scores and analyzes all 8 sections. You watch it work in real time.
            </p>
          </div>
        </div>

        {profile.businessName && (
          <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-accent">
            Pre-filled from your BizList business profile — review and edit before running.
          </p>
        )}

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Business name <span className="text-accent">*</span></span>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Industry / category <span className="text-accent">*</span></span>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Technology, Food & Beverage…"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">City and state</span>
            <input
              value={cityState}
              onChange={(e) => setCityState(e.target.value)}
              placeholder="e.g., Fresno, CA"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">What your business does</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what you do, who you serve, and what makes you different…"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>

        {profile.services.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Services from your profile</p>
            <div className="flex flex-wrap gap-2">
              {profile.services.map((s) => (
                <span key={s.name} className="rounded-full border border-border bg-slate-50 px-3 py-1 text-xs font-medium">
                  {s.name}{s.price ? ` · ${s.price}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-border bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">What the AI will research live</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { icon: "🔍", label: "Website URL & social media profiles" },
              { icon: "⭐", label: "Reviews on Google, Yelp & Facebook" },
              { icon: "📊", label: "Real named competitors in your area" },
              { icon: "📈", label: "Industry trends affecting your business" },
              { icon: "👥", label: "Your typical customer profile" },
              { icon: "🧠", label: "8 scored sections with action plans" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs text-muted">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            disabled={!businessName.trim() || !category.trim() || atLimit}
            onClick={handleRun}
            className="flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <span>Run Full AI Audit</span>
            <span>→</span>
          </button>
          <p className="text-xs text-muted">~45 seconds · live web data</p>
        </div>
      </Card>

      {/* Past reports */}
      {pastAudits.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-1 font-semibold">Past Reports</h2>
          <p className="mb-4 text-xs text-muted">Click any report to view the full audit.</p>
          <div className="space-y-2">
            {pastAudits.map((audit) => {
              const c = scoreColor(audit.overallScore);
              return (
                <button
                  key={audit.id}
                  type="button"
                  onClick={() => setViewingAudit(audit)}
                  className="flex w-full items-center gap-4 rounded-xl border border-border p-3 text-left transition hover:border-accent/40 hover:bg-accent/5"
                >
                  <span className={`shrink-0 rounded-lg border px-3 py-1.5 text-lg font-bold ${c.ring} ${c.text}`}>
                    {audit.overallScore}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{audit.businessName}</p>
                    <p className="text-xs text-muted">{fmtDate(audit.createdAt)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-accent">View →</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Link href="/dashboard" className="mt-4 inline-block text-sm text-muted hover:text-foreground">
        ← Back to dashboard
      </Link>
    </>
  );
}
