import { CustomerProUpsell } from "@/components/customer-pro-upsell";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { UpgradeButton } from "@/components/upgrade-button";
import { Card } from "@/components/ui";
import {
  BIZLIST_PLUS_LABEL,
  isBusinessPlan,
  isCustomerPro,
  PLAN_LABELS,
} from "@/lib/plans";
import type { PlanTier, UserRole } from "@/lib/types";

export function ProfilePlansPanel({
  role,
  planTier,
}: {
  role: UserRole;
  planTier: PlanTier;
}) {
  const isBusinessAccount = role === "business" || role === "organization";
  const onPaidPlan = isBusinessAccount
    ? isBusinessPlan(planTier)
    : isCustomerPro(planTier);

  const currentLabel = isBusinessAccount
    ? PLAN_LABELS[planTier]
    : isCustomerPro(planTier)
      ? BIZLIST_PLUS_LABEL
      : PLAN_LABELS[planTier];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-semibold">Your plan</h2>
        <p className="mt-2 text-sm text-muted">
          Current plan:{" "}
          <span className="font-medium text-foreground">{currentLabel}</span>
        </p>
        {onPaidPlan && (
          <div className="mt-4">
            <ManageBillingButton />
          </div>
        )}
      </Card>

      {isBusinessAccount ? (
        !isBusinessPlan(planTier) ? (
          <Card>
            <h3 className="font-semibold">Upgrade your business</h3>
            <p className="mt-2 text-sm text-muted">
              Unlock leads, AI audits, marketing tools, and more with Pro or Platinum.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <UpgradeButton tier="pro" interval="monthly" label="Upgrade to Pro" />
              <UpgradeButton
                tier="platinum"
                interval="monthly"
                label="Go Platinum"
                className="rounded-full border border-border bg-card px-5 py-3 text-sm font-medium hover:border-accent/40"
              />
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted">
              You are on {PLAN_LABELS[planTier]}. Use Manage billing above to change or cancel.
            </p>
          </Card>
        )
      ) : !isCustomerPro(planTier) ? (
        <CustomerProUpsell />
      ) : (
        <Card>
          <p className="text-sm text-muted">
            You are on {BIZLIST_PLUS_LABEL}. Use Manage billing above to change or cancel.
          </p>
        </Card>
      )}
    </div>
  );
}
