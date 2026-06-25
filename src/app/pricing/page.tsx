import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { PricingPlans } from "@/components/pricing-plans";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Plans for people and businesses"
        description="Community is free. Customers upgrade to AllConnect Plus; businesses upgrade to Pro or Platinum — monthly or yearly."
      />

      <Suspense fallback={<p className="text-center text-sm text-muted">Loading plans...</p>}>
        <PricingPlans />
      </Suspense>

      <p className="mt-8 text-center text-sm text-muted">
        Secure checkout powered by Stripe. Manage or cancel anytime from your dashboard.
      </p>
    </div>
  );
}
