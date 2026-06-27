"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageHeader, Card } from "@/components/ui";
import type { ComprehensiveAuditResult, ComprehensiveAuditSection } from "@/lib/ai/ai-services";

// ─── Profile type ─────────────────────────────────────────────────────────────

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

type ResearchValues = Record<string, string>;

// ─── Progress steps ───────────────────────────────────────────────────────────

const RESEARCH_STEPS = [
  { icon: "🔍", label: "Searching the web for your business" },
  { icon: "⭐", label: "Finding reviews and reputation signals" },
  { icon: "📊", label: "Identifying competitors in your area" },
  { icon: "📈", label: "Analyzing industry trends" },
];

const GENERATE_STEPS = [
  { icon: "👥", label: "Profiling your customer base" },
  { icon: "🧠", label: "Scoring all 8 audit sections" },
  { icon: "📝", label: "Writing your comprehensive report" },
];

const ALL_STEPS = [...RESEARCH_STEPS, ...GENERATE_STEPS];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return { ring: "border-emerald-300 bg-emerald-50", text: "text-emerald-700" };
  if (score >= 55) return { ring: "border-amber-300 bg-amber-50", text: "text-amber-700" };
  return { ring: "border-red-300 bg-red-50", text: "text-red-700" };
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

// ─── Main component ────────────────────────────────────────────────────────────

export default function AuditClient({ profile }: { profile: AuditProfileData }) {
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [category, setCategory] = useState(profile.category);
  const [cityState, setCityState] = useState(profile.cityState);
  const [description, setDescription] = useState(profile.description);

  const [running, setRunning] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [phase, setPhase] = useState<"research" | "generate">("research");
  const [result, setResult] = useState<ComprehensiveAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tick progress within the current phase while running
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startProgressTick(startIdx: number, endIdx: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgressStep(startIdx);
    intervalRef.current = setInterval(() => {
      setProgressStep((s) => {
        if (s >= endIdx - 1) {
          clearInterval(intervalRef.current!);
          return endIdx - 1;
        }
        return s + 1;
      });
    }, 4500);
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function handleRun() {
    if (!businessName.trim() || !category.trim()) {
      setError("Business name and category are required.");
      return;
    }
    setError(null);
    setRunning(true);

    // Phase 1: Web research (steps 0-3)
    setPhase("research");
    startProgressTick(0, RESEARCH_STEPS.length);

    let research: ResearchValues = {};
    try {
      const r1 = await fetch("/api/audit/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          category: category.trim(),
          cityState: cityState.trim(),
        }),
      });
      const d1 = (await r1.json()) as { values?: ResearchValues; error?: string };
      if (r1.ok && d1.values) research = d1.values;
      // Continue even if research failed — generate will use profile data only
    } catch {
      // Non-fatal — continue to generate phase
    }

    // Phase 2: Generate report (steps 4-6)
    setPhase("generate");
    startProgressTick(RESEARCH_STEPS.length, ALL_STEPS.length);

    try {
      const r2 = await fetch("/api/audit/generate", {
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
      const d2 = (await r2.json()) as { result?: ComprehensiveAuditResult; error?: string };
      if (!r2.ok || d2.error) {
        setError(d2.error ?? "Report generation failed. Please try again.");
        setRunning(false);
        return;
      }
      if (d2.result) {
        setProgressStep(ALL_STEPS.length - 1);
        await new Promise((res) => setTimeout(res, 800));
        setResult(d2.result);
      }
    } catch {
      setError("Report generation failed. Check your connection and try again.");
    } finally {
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }

  // ── Progress view ────────────────────────────────────────────────────────────
  if (running) {
    const phaseLabel = phase === "research" ? "Researching online…" : "Generating report…";
    return (
      <>
        <PageHeader
          title="AI Business Audit"
          description={`Analyzing ${businessName} — ${phaseLabel}`}
        />
        <Card>
          <div className="pb-6 pt-2 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <h2 className="text-lg font-bold">Running full AI audit</h2>
            <p className="mt-1 text-sm text-muted">
              {phase === "research"
                ? "Searching the web for reviews, competitors, industry trends, and your online presence…"
                : "Analyzing all 8 audit sections and writing your report…"}
            </p>
          </div>

          <div className="space-y-2">
            {ALL_STEPS.map((step, i) => {
              const done = i < progressStep;
              const active = i === progressStep;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-500 ${
                    active
                      ? "border border-accent/30 bg-accent/5"
                      : done
                      ? "bg-emerald-50/60"
                      : "opacity-25"
                  }`}
                >
                  <span className="text-lg">{step.icon}</span>
                  <span
                    className={`flex-1 text-sm font-medium ${
                      done ? "text-emerald-700" : active ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                  {active && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  )}
                  {done && <span className="text-sm text-emerald-600">✓</span>}
                </div>
              );
            })}
          </div>

          {/* Phase indicator */}
          <div className="mt-4 flex gap-2 border-t border-border pt-4">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${phase === "research" ? "bg-accent text-white" : "bg-emerald-100 text-emerald-700"}`}>
              {phase === "research" ? "● " : "✓ "}Web Research
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${phase === "generate" ? "bg-accent text-white" : "bg-slate-100 text-muted"}`}>
              {phase === "generate" ? "● " : ""}AI Analysis
            </span>
          </div>
        </Card>
      </>
    );
  }

  // ── Report view ──────────────────────────────────────────────────────────────
  if (result) {
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
              onClick={() => { setResult(null); setError(null); }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Run new audit
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

  // ── Setup view ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="AI Business Audit"
        description="One click — the AI searches the web and delivers a full internal + external audit with scores and action plans."
      />

      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xl">
            🤖
          </div>
          <div>
            <p className="font-semibold">Fully automated audit</p>
            <p className="mt-0.5 text-sm text-muted">
              The AI searches the web for your reviews, social profiles, competitors, and industry trends — then scores and analyzes all 8 sections itself. No questionnaire to fill out.
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
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">What the AI will research</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { icon: "🔍", label: "Website, social profiles & channels" },
              { icon: "⭐", label: "Reviews on Google, Yelp & Facebook" },
              { icon: "📊", label: "Real local competitors in your area" },
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
            disabled={!businessName.trim() || !category.trim()}
            onClick={handleRun}
            className="flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <span>Run Full AI Audit</span>
            <span>→</span>
          </button>
          <p className="text-xs text-muted">~45 seconds · uses live web data</p>
        </div>
      </Card>

      <Link href="/dashboard" className="mt-4 inline-block text-sm text-muted hover:text-foreground">
        ← Back to dashboard
      </Link>
    </>
  );
}
