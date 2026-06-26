"use client";

import { useState } from "react";
import Link from "next/link";
import { UpgradeButton } from "@/components/upgrade-button";
import { annualSavings, BIZLIST_PLUS_FEATURES, BIZLIST_PLUS_LABEL, formatPlanPrice, PLAN_PRICES } from "@/lib/plans";
import type { BillingInterval } from "@/lib/types";

const communityFeatures = [
  "Browse listings",
  "Full business profile, services & hiring status",
  "Business posts with photo & video links",
  "Like, follow, review, and message businesses",
  "Forum, collaboration board & work groups",
];

const proFeatures = [
  "Everything in Community",
  "Analytics — page views and offering button clicks",
  "AI online presence audit with website & profile scores",
  "Lead generation from followers, interests, and job seekers",
  "Trending post boost for high engagement",
  `All ${BIZLIST_PLUS_LABEL} perks included (job alerts, early deals, event notifications)`,
];

const platinumFeatures = [
  "Everything in Pro",
  "Automated marketing campaigns & content posting",
  "AI agent for outreach, onboarding, and customer replies",
  "One-click welcome messages for new followers",
];

export function PricingPlans({ userRole }: { userRole: string | null }) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const isAnnual = interval === "annual";

  const showCustomer = userRole === "customer" || userRole === null;
  const showBusiness = userRole !== "customer";

  const intervalToggle = (
    <div className="mb-8 flex justify-center">
      <div className="inline-flex rounded-full border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setInterval("monthly")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition ${
            !isAnnual ? "bg-accent text-white" : "text-muted hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval("annual")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition ${
            isAnnual ? "bg-accent text-white" : "text-muted hover:text-foreground"
          }`}
        >
          Yearly · save ~20%
        </button>
      </div>
    </div>
  );

  if (userRole === "customer") {
    return (
      <>
        {intervalToggle}
        <div className="grid gap-6 md:grid-cols-2">
          <PlanCard
            name={BIZLIST_PLUS_LABEL}
            price={isAnnual ? PLAN_PRICES.customerPro.annual : PLAN_PRICES.customerPro.monthly}
            interval={interval}
            savings={isAnnual ? annualSavings("customerPro") : undefined}
            description="Alerts, matches, early deals, and event notifications."
            features={[...BIZLIST_PLUS_FEATURES]}
            highlighted
            cta={{
              label: isAnnual ? `${BIZLIST_PLUS_LABEL} — yearly` : `${BIZLIST_PLUS_LABEL} — monthly`,
              component: (
                <UpgradeButton
                  tier="customer_pro"
                  interval={interval}
                  label={`Upgrade to ${BIZLIST_PLUS_LABEL}`}
                />
              ),
            }}
          />
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="font-semibold">Why {BIZLIST_PLUS_LABEL}?</h3>
            <p className="mt-2 text-sm text-muted">
              Get job alerts, early access to deals, and event notifications from businesses you follow — all in one place.
            </p>
            <p className="mt-4 text-sm text-muted">
              Manage alerts, following, and messages from your dashboard after you upgrade.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {intervalToggle}

      {showCustomer && (
        <div className="mb-10" id="BizList-plus">
          <h2 className="mb-2 text-2xl font-bold">For customers & job seekers</h2>
          <p className="mb-6 text-sm text-muted">
            {BIZLIST_PLUS_LABEL} for customer accounts. Business Pro and Platinum include the same perks
            at no extra charge.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <PlanCard
              name={BIZLIST_PLUS_LABEL}
              price={isAnnual ? PLAN_PRICES.customerPro.annual : PLAN_PRICES.customerPro.monthly}
              interval={interval}
              savings={isAnnual ? annualSavings("customerPro") : undefined}
              description="Alerts, matches, early deals, and event notifications."
              features={[...BIZLIST_PLUS_FEATURES]}
              highlighted
              cta={{
                label: isAnnual ? `${BIZLIST_PLUS_LABEL} — yearly` : `${BIZLIST_PLUS_LABEL} — monthly`,
                component: (
                  <UpgradeButton
                    tier="customer_pro"
                    interval={interval}
                    label={`Upgrade to ${BIZLIST_PLUS_LABEL}`}
                  />
                ),
              }}
            />
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h3 className="font-semibold">Why {BIZLIST_PLUS_LABEL}?</h3>
              <p className="mt-2 text-sm text-muted">
                If you are job hunting or want the best local deals first, {BIZLIST_PLUS_LABEL} sends alerts and matches
                straight to your profile hub — including new events from businesses you follow.
              </p>
              <p className="mt-4 text-sm text-muted">
                Manage alerts, following, and messages from your home profile tab after you upgrade.
              </p>
            </div>
          </div>
        </div>
      )}

      {showBusiness && (
        <>
          {showCustomer && <h2 className="mb-6 text-2xl font-bold">For businesses</h2>}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <PlanCard
              name="Community"
              price={PLAN_PRICES.free}
              interval={interval}
              description="Free for businesses building a local presence."
              features={communityFeatures}
              cta={{ label: "Join free", href: "/auth/signup" }}
            />
            <PlanCard
              name="Pro"
              price={isAnnual ? PLAN_PRICES.pro.annual : PLAN_PRICES.pro.monthly}
              interval={interval}
              savings={isAnnual ? annualSavings("pro") : undefined}
              description="Local leads and AI audits to grow faster."
              features={proFeatures}
              highlighted
              cta={{
                label: isAnnual ? "Pro — yearly" : "Pro — monthly",
                component: <UpgradeButton tier="pro" interval={interval} label="Upgrade to Pro" />,
              }}
            />
            <PlanCard
              name="Platinum"
              price={isAnnual ? PLAN_PRICES.platinum.annual : PLAN_PRICES.platinum.monthly}
              interval={interval}
              savings={isAnnual ? annualSavings("platinum") : undefined}
              description="Automated marketing and a virtual agent for your business."
              features={platinumFeatures}
              cta={{
                label: isAnnual ? "Platinum — yearly" : "Platinum — monthly",
                component: <UpgradeButton tier="platinum" interval={interval} label="Go Platinum" />,
              }}
            />
          </div>
        </>
      )}
    </>
  );
}

function PlanCard({
  name,
  price,
  interval,
  savings,
  description,
  features,
  highlighted,
  cta,
}: {
  name: string;
  price: number;
  interval: BillingInterval;
  savings?: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta:
    | { label: string; href: string; component?: never }
    | { label: string; component: React.ReactNode; href?: never };
}) {
  const isFree = price === 0;

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border p-5 sm:p-6 ${
        highlighted ? "border-accent bg-blue-50/80 shadow-md ring-1 ring-accent/20" : "border-border bg-card"
      }`}
    >
      {highlighted && (
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
          Most popular
        </span>
      )}
      <h2 className="mt-3 text-2xl font-bold">{name}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <p className="mt-6 text-4xl font-bold">
        ${formatPlanPrice(price)}
        {!isFree && (
          <span className="text-base font-normal text-muted">
            {interval === "annual" ? "/year" : "/month"}
          </span>
        )}
      </p>
      {savings !== undefined && savings > 0 && (
        <p className="mt-1 text-sm font-medium text-emerald-700">
          Save ${formatPlanPrice(savings)} vs monthly
        </p>
      )}
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2 text-sm">
            <span className="text-accent">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 pt-2">
        {cta.href ? (
          <Link
            href={cta.href}
            className={`inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-center text-sm font-medium ${
              highlighted
                ? "bg-accent text-white hover:bg-accent-hover"
                : "border border-border bg-card hover:border-accent/40"
            }`}
          >
            {cta.label}
          </Link>
        ) : (
          cta.component
        )}
      </div>
    </div>
  );
}