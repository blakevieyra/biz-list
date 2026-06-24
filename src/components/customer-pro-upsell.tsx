import Link from "next/link";
import { UpgradeButton } from "@/components/upgrade-button";
import { Card } from "@/components/ui";
import { BIZLIST_PLUS_LABEL, formatPlanPrice, PLAN_PRICES } from "@/lib/plans";

const features = [
  "Job alerts and matches with local businesses",
  "First access to deals, sales, and new product releases",
  "Event notifications from businesses you follow",
];

export function CustomerProUpsell({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Card className="border-accent/20 bg-blue-50/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-accent">{BIZLIST_PLUS_LABEL}</p>
            <p className="text-sm text-muted">
              Get job matches, early deals, and local event alerts — from ${formatPlanPrice(PLAN_PRICES.customerPro.monthly)}/mo.
            </p>
          </div>
          <Link
            href="/pricing#bizlist-plus"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            View plans
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card id="bizlist-plus" className="border-accent/20">
      <h2 className="text-xl font-semibold">{BIZLIST_PLUS_LABEL}</h2>
      <p className="mt-2 text-sm text-muted">
        For job seekers and local shoppers who want alerts, matches, and first pick on deals and events.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="text-accent">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <UpgradeButton tier="customer_pro" interval="monthly" label={`${BIZLIST_PLUS_LABEL} — monthly`} />
        <UpgradeButton
          tier="customer_pro"
          interval="annual"
          label={`${BIZLIST_PLUS_LABEL} — yearly`}
          className="rounded-full border border-border bg-card px-5 py-3 text-sm font-medium hover:border-accent/40"
        />
      </div>
    </Card>
  );
}
