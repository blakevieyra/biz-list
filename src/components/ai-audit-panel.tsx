"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runBusinessProfileAudit } from "@/lib/actions/pro";
import { Card, formatDate } from "@/components/ui";
import type { AiAssessment } from "@/lib/types";
import { canAccess } from "@/lib/plans";
import type { PlanTier } from "@/lib/types";

function ScoreRing({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75 ? "text-emerald-700 bg-emerald-50" : value >= 50 ? "text-amber-800 bg-amber-50" : "text-red-700 bg-red-50";

  return (
    <div className={`rounded-xl border border-border p-3 text-center ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}

export function AiAuditPanel({
  planTier,
  latest,
  compact = false,
}: {
  planTier: PlanTier;
  latest: AiAssessment | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hasAccess = canAccess(planTier, "aiAudit");

  if (!hasAccess) {
    return (
      <Card>
        <h2 className="font-semibold">AI online presence audit</h2>
        <p className="mt-2 text-sm text-muted">
          Pro and Platinum members get scored audits for website presence, SEO, profile completeness,
          and clarity.
        </p>
        <Link href="/pricing" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          Upgrade to Pro →
        </Link>
      </Card>
    );
  }

  function handleRun() {
    startTransition(async () => {
      setError(null);
      const result = await runBusinessProfileAudit();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">AI online presence audit</h2>
          <p className="mt-1 text-sm text-muted">
            Scores your website, BizList profile, SEO, and local visibility.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={handleRun}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Analyzing..." : latest ? "Re-run audit" : "Run audit"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {latest ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-3xl font-bold">{latest.overallScore}/100</p>
              <p className="text-xs text-muted">Overall · {formatDate(latest.createdAt)}</p>
            </div>
            {!compact && (
              <Link href="/dashboard/assessment" className="text-sm text-accent hover:underline">
                Full report →
              </Link>
            )}
          </div>
          <p className="mt-3 text-sm text-muted">{latest.summary}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <ScoreRing label="Website" value={latest.websiteScore ?? latest.seoScore} />
            <ScoreRing label="SEO" value={latest.seoScore} />
            <ScoreRing label="Presence" value={latest.onlinePresenceScore} />
            <ScoreRing label="Clarity" value={latest.businessClarityScore} />
            <ScoreRing label="Profile" value={latest.profileScore ?? latest.businessClarityScore} />
          </div>
          {!compact && latest.recommendations.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {latest.recommendations.slice(0, 4).map((item) => (
                <li key={item} className="text-sm text-muted">
                  • {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Run your first audit to see website, profile, and SEO scores with actionable recommendations.
        </p>
      )}
    </Card>
  );
}
