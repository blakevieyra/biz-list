import Link from "next/link";
import { UpgradeButton } from "@/components/upgrade-button";
import { Card } from "@/components/ui";
import {
  annualSavings,
  BIZLIST_PLUS_LABEL,
  BIZLIST_PLUS_FEATURES,
  formatPlanPrice,
  PLAN_PRICES,
} from "@/lib/plans";

export function CustomerProUpsell({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Card className="border-accent/20 bg-blue-50/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-accent">{BIZLIST_PLUS_LABEL}</p>
            <p className="text-sm text-muted">
              Job alerts, early deals, and local event notifications — from $
              {formatPlanPrice(PLAN_PRICES.customerPro.monthly)}/mo or $
              {formatPlanPrice(PLAN_PRICES.customerPro.annual)}/yr.
            </p>
          </div>
          <Link
            href="/profile?tab=plans"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            View plans
          </Link>
        </div>
      </Card>
    );
  }

  const monthlyPrice = PLAN_PRICES.customerPro.monthly;
  const annualPrice = PLAN_PRICES.customerPro.annual;
  const yearlySavings = annualSavings("customerPro");

  return (
    <Card id="bizlist-plus" className="border-accent/20">
      <h2 className="text-xl font-semibold">{BIZLIST_PLUS_LABEL}</h2>
      <p className="mt-2 text-sm text-muted">
        For job seekers and local shoppers who want alerts, matches, and first pick on deals and events.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Monthly</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            ${formatPlanPrice(monthlyPrice)}
            <span className="text-sm font-normal text-muted">/mo</span>
          </p>
          <p className="mt-1 text-xs text-muted">Billed every month. Cancel anytime.</p>
        </div>
        <div className="rounded-xl border border-accent/30 bg-blue-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Yearly</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            ${formatPlanPrice(annualPrice)}
            <span className="text-sm font-normal text-muted">/yr</span>
          </p>
          <p className="mt-1 text-xs text-accent">
            Save ${formatPlanPrice(yearlySavings)} vs paying monthly
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">What&apos;s included</p>
        <ul className="mt-3 space-y-2 text-sm">
          {BIZLIST_PLUS_FEATURES.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className="shrink-0 text-accent">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <UpgradeButton
          tier="customer_pro"
          interval="monthly"
          label={`${BIZLIST_PLUS_LABEL} — $${formatPlanPrice(monthlyPrice)}/mo`}
        />
        <UpgradeButton
          tier="customer_pro"
          interval="annual"
          label={`${BIZLIST_PLUS_LABEL} — $${formatPlanPrice(annualPrice)}/yr`}
          className="rounded-full border border-border bg-card px-5 py-3 text-sm font-medium hover:border-accent/40"
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        Compare all plans on{" "}
        <Link href="/pricing#bizlist-plus" className="font-medium text-accent hover:underline">
          the pricing page
        </Link>
        .
      </p>
    </Card>
  );
}
