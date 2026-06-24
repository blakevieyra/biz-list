import { AiAuditPanel } from "@/components/ai-audit-panel";
import { LeadsPreviewPanel } from "@/components/leads-preview-panel";
import { PlatinumGrowthPanel } from "@/components/platinum-growth-panel";
import type { AiAssessment, LocalLead, PlanTier } from "@/lib/types";

export function BusinessGrowthHub({
  planTier,
  latestAudit,
  leads,
}: {
  planTier: PlanTier;
  latestAudit: AiAssessment | null;
  leads: LocalLead[];
}) {
  return (
    <div className="space-y-6">
      <AiAuditPanel planTier={planTier} latest={latestAudit} />
      <LeadsPreviewPanel planTier={planTier} leads={leads} />
      <PlatinumGrowthPanel planTier={planTier} />
    </div>
  );
}
