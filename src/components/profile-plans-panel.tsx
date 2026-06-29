import Link from "next/link";
import { CustomerProUpsell } from "@/components/customer-pro-upsell";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { UpgradeButton } from "@/components/upgrade-button";
import { Card } from "@/components/ui";
import {
  BIZLIST_PLUS_FEATURES,
  BIZLIST_PLUS_LABEL,
  BUSINESS_FREE_FEATURES,
  BUSINESS_PRO_FEATURES,
  BUSINESS_PLATINUM_FEATURES,
  isBusinessPlan,
  isCustomerPro,
  PLAN_LABELS,
  PLAN_PRICES,
} from "@/lib/plans";
import type { PlanTier, UserRole } from "@/lib/types";

function FeatureList({ features }: { features: readonly string[] }) {
  return (
    <ul className="mt-2 space-y-1.5 text-sm">
      {features.map((f) => (
        <li key={f} className="flex gap-2">
          <span className="text-accent">✓</span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProfilePlansPanel({
  role,
  planTier,
}: {
  role: UserRole;
  planTier: PlanTier;
}) {
  const isBusinessAccount =
    role === "business" || role === "organization" || role === "marketer";
  const onPaidPlan = isBusinessAccount
    ? isBusinessPlan(planTier)
    : isCustomerPro(planTier);

  const currentLabel = PLAN_LABELS[planTier];

  return (
    <div className="space-y-6">
      {/* Current plan summary */}
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
        planTier === "free" ? (
          /* Business on free — show what they have + upsell */
          <>
            <Card>
              <h3 className="font-semibold">Community plan — included free</h3>
              <p className="mt-1 text-sm text-muted">Your current plan includes:</p>
              <FeatureList features={BUSINESS_FREE_FEATURES} />
            </Card>
            <Card>
              <h3 className="font-semibold">Upgrade your business</h3>
              <p className="mt-2 text-sm text-muted">
                Unlock leads, AI audits, marketing automation, and a virtual agent with Pro or
                Platinum.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <p className="font-semibold">Pro — ${PLAN_PRICES.pro.monthly}/mo</p>
                  <FeatureList features={BUSINESS_PRO_FEATURES} />
                  <div className="mt-4">
                    <UpgradeButton tier="pro" interval="monthly" label="Upgrade to Pro" />
                  </div>
                </div>
                <div className="rounded-xl border-2 border-accent p-4">
                  <p className="font-semibold">
                    Platinum — ${PLAN_PRICES.platinum.monthly}/mo
                    <span className="ml-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                      Most powerful
                    </span>
                  </p>
                  <FeatureList features={BUSINESS_PLATINUM_FEATURES} />
                  <div className="mt-4">
                    <UpgradeButton tier="platinum" interval="monthly" label="Go Platinum" />
                  </div>
                </div>
              </div>
            </Card>
          </>
        ) : planTier === "pro" ? (
          /* Business on Pro */
          <>
            <Card>
              <h3 className="font-semibold">Your Pro plan</h3>
              <p className="mt-1 text-sm text-muted">
                Business growth tools are active on your account.
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                What&apos;s included
              </p>
              <FeatureList features={[...BUSINESS_FREE_FEATURES, ...BUSINESS_PRO_FEATURES]} />
              <p className="mt-4 text-sm text-muted">
                Use Manage billing above to change or cancel your plan. Manage alert preferences on{" "}
                <Link href="/dashboard/profile" className="text-accent hover:underline">
                  Dashboard → Profile
                </Link>
                .
              </p>
            </Card>
            <Card>
              <h3 className="font-semibold">
                Upgrade to Platinum — ${PLAN_PRICES.platinum.monthly}/mo
              </h3>
              <p className="mt-1 text-sm text-muted">
                Add marketing automation, a virtual AI agent, and the affiliate marketer program.
              </p>
              <FeatureList features={BUSINESS_PLATINUM_FEATURES} />
              <div className="mt-4">
                <UpgradeButton tier="platinum" interval="monthly" label="Upgrade to Platinum" />
              </div>
            </Card>
          </>
        ) : (
          /* Business on Platinum */
          <Card>
            <h3 className="font-semibold">Your Platinum plan</h3>
            <p className="mt-1 text-sm text-muted">
              All business growth tools are active on your account.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Included features
            </p>
            <FeatureList features={[...BUSINESS_FREE_FEATURES, ...BUSINESS_PRO_FEATURES, ...BUSINESS_PLATINUM_FEATURES]} />
            <p className="mt-4 text-sm text-muted">
              Use Manage billing above to change or cancel your plan. Manage alert preferences on{" "}
              <Link href="/dashboard/profile" className="text-accent hover:underline">
                Dashboard → Profile
              </Link>
              .
            </p>
          </Card>
        )
      ) : !isCustomerPro(planTier) ? (
        /* Customer on free — upsell */
        <>
          <CustomerProUpsell />
        </>
      ) : (
        /* Customer on Pro/Plus */
        <Card>
          <h3 className="font-semibold">Your {BIZLIST_PLUS_LABEL} plan</h3>
          <p className="mt-1 text-sm text-muted">
            You have access to all member perks.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
            What&apos;s included
          </p>
          <FeatureList features={BIZLIST_PLUS_FEATURES} />
          <p className="mt-4 text-sm text-muted">
            Use Manage billing above to change or cancel your plan.
          </p>
        </Card>
      )}
    </div>
  );
}