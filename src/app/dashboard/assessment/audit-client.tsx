"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useTransition } from "react";
import { PageHeader, Card } from "@/components/ui";
import type { ComprehensiveAuditResult, ComprehensiveAuditSection } from "@/lib/ai/ai-services";
import { emailAuditReport } from "@/lib/actions/pro";

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
  { icon: "📧", label: "Finding public contact email address", phase: "research" },
  { icon: "🌐", label: "Reading your website — extracting pricing & services", phase: "research" },
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
  const tier = section.score >= 75 ? "green" : section.score >= 55 ? "amber" : "red";
  return (
    <div className={`audit-section ${tier} rounded-xl border p-4 ${c.ring}`}>
      {/* Screen: toggle button */}
      <button
        type="button"
        className="audit-section-header flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className={`audit-section-score ${tier} text-2xl font-bold ${c.text}`}>{section.score}</span>
          <div>
            <p className="audit-section-title font-semibold">{section.label}</p>
            <p className="audit-section-summary text-xs text-muted">{section.summary}</p>
          </div>
        </div>
        <span className="audit-section-toggle shrink-0 text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {/* Body — hidden on screen until open; always shown in print */}
      <div className={`audit-section-body mt-4 gap-4 border-t border-border pt-4 sm:grid-cols-3 ${open ? "grid" : "hidden"}`}>
        <div className="audit-section-col strengths">
          <span className="audit-section-col-label green mb-1.5 block text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</span>
          <ul className="space-y-1">
            {section.strengths.map((s) => <li key={s} className="text-sm text-muted">• {s}</li>)}
          </ul>
        </div>
        <div className="audit-section-col gaps">
          <span className="audit-section-col-label red mb-1.5 block text-xs font-semibold uppercase tracking-wide text-red-600">Gaps &amp; Risks</span>
          <ul className="space-y-1">
            {section.gaps.map((g) => <li key={g} className="text-sm text-muted">• {g}</li>)}
          </ul>
        </div>
        <div className="audit-section-col actions">
          <span className="audit-section-col-label blue mb-1.5 block text-xs font-semibold uppercase tracking-wide text-accent">Action Items</span>
          <ul className="space-y-1">
            {section.actions.map((a) => <li key={a} className="text-sm text-muted">→ {a}</li>)}
          </ul>
        </div>
      </div>
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
  const [emailPending, startEmail] = useTransition();
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");

  function handlePrint() {
    window.print();
  }

  function handleEmail() {
    setEmailStatus("idle");
    startEmail(async () => {
      const res = await emailAuditReport(result, businessName);
      setEmailStatus(res.error ? "error" : "sent");
    });
  }

  const generatedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <style>{`
        /* ── Print reset ────────────────────────────────── */
        @media print {
          @page { margin: 0.55in 0.6in 0.6in 0.6in; size: letter; }

          *, *::before, *::after { box-sizing: border-box !important; }

          nav, header, aside, footer,
          [data-sidebar], [data-nav],
          .print\\:hidden { display: none !important; }

          body {
            background: #fff !important;
            color: #001B44 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 8.5pt !important;
            line-height: 1.35 !important;
          }

          /* ── Running page header (repeats on every page) */
          .audit-running-header {
            display: flex !important;
            position: fixed !important;
            top: -0.55in !important;
            left: -0.6in !important;
            right: -0.6in !important;
            height: 34px !important;
            background: #001B44 !important;
            color: #fff !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0 20px !important;
            z-index: 9999 !important;
          }
          .audit-running-header-left {
            font-size: 7pt !important;
            font-weight: 700 !important;
            letter-spacing: 1.5px !important;
            text-transform: uppercase !important;
            color: #fff !important;
          }
          .audit-running-header-right {
            font-size: 7pt !important;
            color: #94a3b8 !important;
          }

          /* ── Running footer */
          .audit-running-footer {
            display: flex !important;
            position: fixed !important;
            bottom: -0.6in !important;
            left: -0.6in !important;
            right: -0.6in !important;
            height: 26px !important;
            background: #F1F5F9 !important;
            border-top: 1px solid #E2E8F0 !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0 20px !important;
          }
          .audit-running-footer span {
            font-size: 6.5pt !important;
            color: #64748B !important;
          }
          .audit-running-footer-page::after {
            content: counter(page) !important;
          }

          /* ── Cover block */
          .audit-cover-accent { border-top: 4px solid #2563EB !important; padding-top: 16px !important; margin-bottom: 10px !important; }
          .audit-cover-title { font-size: 22pt !important; font-weight: 800 !important; color: #001B44 !important; margin: 0 0 4px !important; }
          .audit-cover-sub { font-size: 11pt !important; color: #64748B !important; margin: 0 0 2px !important; }
          .audit-cover-date { font-size: 8pt !important; color: #94a3b8 !important; margin: 0 0 14px !important; }
          .audit-cover-divider { border: none !important; border-top: 1px solid #E2E8F0 !important; margin: 0 0 18px !important; }

          /* ── Score cards */
          .audit-score-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 10px !important;
            margin-bottom: 16px !important;
          }
          .audit-score-card {
            border-radius: 12px !important;
            border-width: 1.5px !important;
            border-style: solid !important;
            padding: 14px 10px !important;
            text-align: center !important;
          }
          .audit-score-card.green  { background: #ECFDF5 !important; border-color: #6EE7B7 !important; }
          .audit-score-card.amber  { background: #FFFBEB !important; border-color: #FCD34D !important; }
          .audit-score-card.red    { background: #FEF2F2 !important; border-color: #FCA5A5 !important; }
          .audit-score-num { font-size: 28pt !important; font-weight: 800 !important; line-height: 1.1 !important; }
          .audit-score-num.green { color: #059669 !important; }
          .audit-score-num.amber { color: #D97706 !important; }
          .audit-score-num.red   { color: #DC2626 !important; }
          .audit-score-label { font-size: 7.5pt !important; font-weight: 700 !important; color: #001B44 !important; margin-top: 3px !important; }
          .audit-score-sub { font-size: 6pt !important; color: #64748B !important; margin-top: 2px !important; }

          /* ── Exec summary box */
          .audit-exec-box {
            background: #F8FAFC !important;
            border: 1px solid #E2E8F0 !important;
            border-radius: 8px !important;
            padding: 12px 14px !important;
            margin-bottom: 14px !important;
          }
          .audit-exec-box h2 { font-size: 9pt !important; font-weight: 700 !important; margin: 0 0 5px !important; color: #001B44 !important; }
          .audit-exec-box p  { font-size: 8pt !important; color: #001B44 !important; margin: 0 !important; line-height: 1.4 !important; }

          /* ── Priority action plan */
          .audit-priority-box {
            background: #F8FAFC !important;
            border: 1px solid #E2E8F0 !important;
            border-radius: 8px !important;
            padding: 12px 14px !important;
            margin-bottom: 14px !important;
          }
          .audit-priority-box h2  { font-size: 9pt !important; font-weight: 700 !important; margin: 0 0 2px !important; }
          .audit-priority-box > p { font-size: 7.5pt !important; color: #64748B !important; margin: 0 0 8px !important; }
          .audit-priority-row {
            display: flex !important;
            align-items: flex-start !important;
            gap: 8px !important;
            padding: 7px 8px !important;
            border-radius: 8px !important;
            margin-bottom: 5px !important;
            border-width: 0.8px !important;
            border-style: solid !important;
          }
          .audit-priority-row.high   { background: #FEF2F2 !important; border-color: #FCA5A5 !important; }
          .audit-priority-row.medium { background: #FFFBEB !important; border-color: #FCD34D !important; }
          .audit-priority-row.low    { background: #F8FAFC !important; border-color: #E2E8F0 !important; }
          .audit-priority-badge {
            border-radius: 999px !important;
            padding: 2px 7px !important;
            font-size: 6.5pt !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }
          .audit-priority-badge.high   { background: #DC2626 !important; color: #fff !important; }
          .audit-priority-badge.medium { background: #D97706 !important; color: #fff !important; }
          .audit-priority-badge.low    { background: #64748B !important; color: #fff !important; }
          .audit-priority-cat  { font-size: 7pt !important; color: #64748B !important; flex-shrink: 0 !important; width: 90px !important; padding-top: 1px !important; }
          .audit-priority-text p:first-child { font-size: 8pt !important; font-weight: 600 !important; color: #001B44 !important; margin: 0 0 1px !important; }
          .audit-priority-text p:last-child  { font-size: 7pt !important; color: #64748B !important; margin: 0 !important; }

          /* ── Phase separator */
          .audit-phase-separator {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            margin: 18px 0 10px !important;
          }
          .audit-phase-separator-line { flex: 1 !important; border: none !important; border-top: 2px solid #2563EB !important; }
          .audit-phase-separator-label {
            font-size: 7.5pt !important;
            font-weight: 700 !important;
            color: #2563EB !important;
            letter-spacing: 0.8px !important;
            text-transform: uppercase !important;
            white-space: nowrap !important;
          }
          .audit-phase-heading { display: none !important; }

          /* ── Section cards */
          .audit-section {
            border-width: 1.2px !important;
            border-style: solid !important;
            border-radius: 10px !important;
            margin-bottom: 8px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .audit-section.green { background: #ECFDF5 !important; border-color: #6EE7B7 !important; }
          .audit-section.amber { background: #FFFBEB !important; border-color: #FCD34D !important; }
          .audit-section.red   { background: #FEF2F2 !important; border-color: #FCA5A5 !important; }

          .audit-section-header { display: flex !important; align-items: flex-start !important; gap: 10px !important; padding: 10px 12px !important; }
          .audit-section-score { font-size: 18pt !important; font-weight: 800 !important; line-height: 1 !important; flex-shrink: 0 !important; }
          .audit-section-score.green { color: #059669 !important; }
          .audit-section-score.amber { color: #D97706 !important; }
          .audit-section-score.red   { color: #DC2626 !important; }
          .audit-section-title   { font-size: 9.5pt !important; font-weight: 700 !important; color: #001B44 !important; margin: 1px 0 2px !important; }
          .audit-section-summary { font-size: 7pt !important; color: #64748B !important; line-height: 1.3 !important; }
          .audit-section-toggle  { display: none !important; }

          /* Force body open */
          .audit-section-body {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 0 !important;
            border-top: 1px solid rgba(0,0,0,0.08) !important;
          }
          .audit-section-col {
            padding: 9px 11px !important;
            border-right: 1px solid rgba(0,0,0,0.08) !important;
          }
          .audit-section-col:last-child { border-right: none !important; }
          .audit-section-col-label {
            font-size: 6pt !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            margin-bottom: 5px !important;
            display: block !important;
          }
          .audit-section-col-label.green { color: #065F46 !important; }
          .audit-section-col-label.red   { color: #991B1B !important; }
          .audit-section-col-label.blue  { color: #1E40AF !important; }
          .audit-section-col li {
            font-size: 7.5pt !important;
            line-height: 1.35 !important;
            margin-bottom: 4px !important;
            list-style: none !important;
            padding-left: 0 !important;
          }
          .audit-section-col.strengths li { color: #064E3B !important; }
          .audit-section-col.gaps li      { color: #7F1D1D !important; }
          .audit-section-col.actions li   { color: #1E3A8A !important; }
        }

        @media screen {
          .audit-running-header,
          .audit-running-footer,
          .audit-cover-accent,
          .audit-cover-title,
          .audit-cover-sub,
          .audit-cover-date,
          .audit-cover-divider,
          .audit-score-grid,
          .audit-exec-box,
          .audit-priority-box,
          .audit-phase-separator { display: none; }
        }
      `}</style>

      {/* ── Print-only running header (repeats on every page) ── */}
      <div className="audit-running-header">
        <span className="audit-running-header-left">BizList · AI Business Audit Report</span>
        <span className="audit-running-header-right">{businessName}</span>
      </div>

      {/* ── Print-only running footer ── */}
      <div className="audit-running-footer">
        <span>Generated {generatedDate} · Confidential — {businessName}</span>
        <span>Page <span className="audit-running-footer-page" /></span>
      </div>

      {/* ── Print-only cover block ── */}
      <div className="audit-cover-accent">
        <p className="audit-cover-title">{businessName}</p>
        <p className="audit-cover-sub">AI Business Audit Report</p>
        <p className="audit-cover-date">Generated {generatedDate}</p>
      </div>
      <hr className="audit-cover-divider" />

      {/* ── Print-only score grid ── */}
      <div className="audit-score-grid">
        {[
          { label: "Overall Score", value: result.overallScore, sub: "Weighted average" },
          { label: "Internal Health", value: result.internalScore, sub: "Operations · Finance · Team · Products" },
          { label: "External Positioning", value: result.externalScore, sub: "Market · Customers · Brand · Growth" },
        ].map(({ label, value, sub }) => {
          const tier = value >= 75 ? "green" : value >= 55 ? "amber" : "red";
          return (
            <div key={label} className={`audit-score-card ${tier}`}>
              <div className={`audit-score-num ${tier}`}>{value}</div>
              <div className="audit-score-label">{label}</div>
              <div className="audit-score-sub">{sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── Print-only exec summary ── */}
      <div className="audit-exec-box">
        <h2>Executive Summary</h2>
        <p>{result.executiveSummary}</p>
      </div>

      {/* ── Print-only priority actions ── */}
      <div className="audit-priority-box">
        <h2>Priority Action Plan</h2>
        <p>Ranked by impact — tackle High items first.</p>
        {result.priorityActions.map((a, i) => (
          <div key={i} className={`audit-priority-row ${a.priority}`}>
            <span className={`audit-priority-badge ${a.priority}`}>{a.priority.toUpperCase()}</span>
            <span className="audit-priority-cat">{a.category}</span>
            <div className="audit-priority-text">
              <p>{a.action}</p>
              <p>{a.impact}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Screen-only report header ── */}
      <PageHeader
        title="Business Audit Report"
        description={`${businessName} · Full internal & external AI audit`}
        action={
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleEmail}
              disabled={emailPending}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40 disabled:opacity-50"
            >
              {emailPending ? "Sending…" : emailStatus === "sent" ? "Sent!" : emailStatus === "error" ? "Error — retry" : "Email Report"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              {backLabel}
            </button>
          </div>
        }
      />

      {/* ── Screen score cards ── */}
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

      {/* ── Internal sections ── */}
      <div className="mt-6">
        <h2 className="audit-phase-heading mb-3 font-semibold text-foreground/70">Internal Audit — tap any section to expand</h2>
        {/* Print-only phase separator */}
        <div className="audit-phase-separator">
          <div className="audit-phase-separator-line" />
          <span className="audit-phase-separator-label">Internal Audit — Operations, Finance, Team, Products, Legal &amp; Credibility</span>
          <div className="audit-phase-separator-line" />
        </div>
        <div className="space-y-3">
          {internalSections.map((s) => <SectionCard key={s.id} section={s} />)}
        </div>
      </div>

      {/* ── External sections ── */}
      <div className="mt-6">
        <h2 className="audit-phase-heading mb-3 font-semibold text-foreground/70">External Audit — tap any section to expand</h2>
        {/* Print-only phase separator */}
        <div className="audit-phase-separator">
          <div className="audit-phase-separator-line" />
          <span className="audit-phase-separator-label">External Audit — Market, Customers, Brand, Growth &amp; Digital Activity</span>
          <div className="audit-phase-separator-line" />
        </div>
        <div className="space-y-3">
          {externalSections.map((s) => <SectionCard key={s.id} section={s} />)}
        </div>
      </div>

      <Link href="/dashboard" className="mt-8 inline-block text-sm text-accent hover:underline print:hidden">
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
  const startTimeRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
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

  // Request notification permission when audit starts
  useEffect(() => {
    if (running && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [running]);

  // Countdown timer
  useEffect(() => {
    if (!running) {
      setElapsed(0);
      startTimeRef.current = null;
      return;
    }
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  function fireNotification(score: number) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification("BizList Audit Complete!", {
        body: `Your ${businessName} audit is ready — overall score ${score}/100. Click to view your report.`,
        icon: "/favicon.ico",
      });
    } catch {}
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
        body: JSON.stringify({ businessName: businessName.trim(), category: category.trim(), cityState: cityState.trim(), website: profile.website?.trim() || "" }),
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

    // ── Phase 2: Generate report (steps 6-8) ─────────────────────────────────
    for (let i = 6; i <= 8; i++) {
      setActiveStep(i);
      setStep(i, { state: "analyzing" });
      if (i < 8) await new Promise((r) => setTimeout(r, 4000));
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
        setStep(7, { state: "found", finding: "Report complete" });
        fireNotification(genData.result.overallScore);
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
    const researchDone = steps.slice(0, 6).every((s) => s.state === "found");
    const progressPct = Math.min(
      Math.round(((activeStep + (researchDone ? 1 : 0)) / STEPS.length) * 100),
      95,
    );
    const ESTIMATED_SECS = 90;
    const remaining = Math.max(0, ESTIMATED_SECS - elapsed);
    const timeLabel =
      remaining >= 60
        ? `~${Math.ceil(remaining / 60)}m remaining`
        : remaining > 0
        ? `~${remaining}s remaining`
        : "Finalizing report…";

    return (
      <>
        <PageHeader title="AI Business Audit" description={`Analyzing ${businessName}…`} />
        <Card>
          <div className="pb-4 pt-2 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <h2 className="text-lg font-bold">Running full AI audit</h2>
            <p className="mt-1 text-sm text-muted">
              {!researchDone
                ? "Searching the web and reading your website for live data…"
                : "Scoring all 11 dimensions and writing your report…"}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-2 px-1">
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span>Step {Math.min(activeStep + 1, STEPS.length)} of {STEPS.length}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted/70">{timeLabel}</span>
                <span className="font-medium">{progressPct}%</span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Safe to navigate away notice */}
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>
              <strong>Keep this tab open.</strong> This audit runs in your browser and takes 60–90 seconds.
              We&apos;ll show a browser notification when your report is ready — you can switch to another tab, just don&apos;t close this one.
            </span>
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 overflow-hidden">
            <img src="/bizlist-logo.png" alt="BizList" className="h-8 w-8 object-contain" />
          </div>
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
              { icon: "📧", label: "Public contact email discoverability" },
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
