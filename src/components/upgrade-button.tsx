"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { startCheckout } from "@/lib/actions/billing";
import type { BillingInterval, PaidPlanTier } from "@/lib/types";
import { BIZLIST_PLUS_LABEL, PLAN_LABELS } from "@/lib/plans";

function planLabel(tier: PaidPlanTier): string {
  if (tier === "customer_pro") return BIZLIST_PLUS_LABEL;
  return PLAN_LABELS[tier];
}

export function UpgradeButton({
  tier,
  interval,
  label,
  className,
}: {
  tier: PaidPlanTier;
  interval: BillingInterval;
  label?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams.get("canceled") ? "Checkout canceled. You can try again anytime." : null,
  );

  return (
    <div className="w-full">
      <form
        action={async () => {
          setError(null);
          const result = await startCheckout(tier, interval);
          if (result?.error) setError(result.error);
        }}
        className="w-full"
      >
        <button
          type="submit"
          className={
            className ??
            "w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-hover"
          }
        >
          {label ?? `Upgrade to ${planLabel(tier)}`}
        </button>
      </form>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}