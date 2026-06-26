import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { PricingPlans } from "@/components/pricing-plans";
import { getCurrentProfile } from "@/lib/data";

export default async function PricingPage() {
  const profile = await getCurrentProfile();
  const userRole = profile?.role ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={
          userRole === "customer"
            ? "Upgrade your account"
            : userRole
              ? "Upgrade your business"
              : "Plans for people and businesses"
        }
        description={
          userRole === "customer"
            ? "Get job alerts, early deals, and event notifications with BizList Plus."
            : userRole
              ? "Unlock leads, AI audits, and automated marketing to grow locally."
              : "Community is free. Customers upgrade to BizList Plus; businesses upgrade to Pro or Platinum."
        }
      />

      <Suspense fallback={<p className="text-center text-sm text-muted">Loading plans...</p>}>
        <PricingPlans userRole={userRole} />
      </Suspense>

      <p className="mt-8 text-center text-sm text-muted">
        Secure checkout powered by Stripe. Manage or cancel anytime from your dashboard.
      </p>
    </div>
  );
}
