import Link from "next/link";
import { Card } from "@/components/ui";
import type { AiAssessment, PlanTier } from "@/lib/types";
import { canAccess } from "@/lib/plans";

export function AiAuditPanel({
  planTier,
  latest,
}: {
  planTier: PlanTier;
  latest: AiAssessment | null;
  compact?: boolean;
}) {
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

  return (
    <Card>
      <h2 className="font-semibold">AI online presence audit</h2>
      <p className="mt-2 text-sm text-muted">
        Scans website, profile, SEO, content interaction, industry fit, and location signals.
        {latest ? ` Last run: ${new Date(latest.createdAt).toLocaleDateString()}.` : ""}
      </p>
      {latest && (
        <p className="mt-1 text-2xl font-bold">
          {latest.overallScore}
          <span className="text-sm font-normal text-muted">/100</span>
        </p>
      )}
      <Link
        href="/dashboard/assessment"
        className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        {latest ? "View full audit →" : "Run audit →"}
      </Link>
    </Card>
  );
}
