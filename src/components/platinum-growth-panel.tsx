import Link from "next/link";
import { Card } from "@/components/ui";
import type { PlanTier } from "@/lib/types";
import { canAccess } from "@/lib/plans";

export function PlatinumGrowthPanel({ planTier }: { planTier: PlanTier }) {
  const hasMarketing = canAccess(planTier, "automatedMarketing");
  const hasAgent = canAccess(planTier, "virtualAgent");

  if (!hasMarketing && !hasAgent) {
    return (
      <Card>
        <h2 className="font-semibold">Platinum AI agent</h2>
        <p className="mt-2 text-sm text-muted">
          Platinum automates marketing outreach, customer onboarding messages, and content posting
          for your business.
        </p>
        <Link href="/pricing" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          Upgrade to Platinum →
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-semibold">Platinum AI agent</h2>
      <p className="mt-2 text-sm text-muted">
        Auto-post fresh content, outreach matched leads with custom intros, welcome new followers,
        and reply when customers message back.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {hasAgent && (
          <Link href="/dashboard/agent" className="text-sm font-medium text-accent hover:underline">
            AI agent →
          </Link>
        )}
        {hasMarketing && (
          <Link href="/dashboard/marketing" className="text-sm font-medium text-accent hover:underline">
            Marketing campaigns →
          </Link>
        )}
      </div>
    </Card>
  );
}
