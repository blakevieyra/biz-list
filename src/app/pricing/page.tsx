import type { ReactNode } from "react";
import Link from "next/link";
import { UpgradeButton } from "@/components/upgrade-button";
import { PageHeader } from "@/components/ui";
import { PRO_PLAN_PRICE } from "@/lib/types";

const freeFeatures = [
  "Business directory listing",
  "Forum posts and comments",
  "Follow and connect with businesses",
  "Collaboration board",
  "Direct messaging",
];

const proFeatures = [
  "AI business assessment — SEO, online presence, and clarity scores",
  "Personalized recommendations to improve local visibility",
  "Local lead access — customers in your area with matching interests",
  "Match scores based on location, tags, and forum activity",
  "Message leads directly from your dashboard",
  "Priority placement in directory (coming soon)",
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Plans for growing local businesses"
        description="Start free. Upgrade to Pro for AI insights and local leads from customers in your area."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <PlanCard
          name="Free"
          price={0}
          description="Everything you need to list, connect, and join the community."
          features={freeFeatures}
          cta={{ label: "Get started free", href: "/auth/signup" }}
        />
        <PlanCard
          name="Pro"
          price={PRO_PLAN_PRICE}
          description="AI-powered growth tools plus local leads matched to your category and area."
          features={proFeatures}
          highlighted
          cta={{ label: "Upgrade to Pro", component: <UpgradeButton /> }}
        />
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        Pro includes AI assessment of your website, SEO, online presence, and business messaging —
        plus access to local users interested in your line of work.
      </p>
    </div>
  );
}

function PlanCard({
  name,
  price,
  description,
  features,
  highlighted,
  cta,
}: {
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta:
    | { label: string; href: string; component?: never }
    | { label: string; component: ReactNode; href?: never };
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlighted ? "border-accent bg-teal-50 shadow-md" : "border-border bg-card"
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
        ${price}
        <span className="text-base font-normal text-muted">/month</span>
      </p>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2 text-sm">
            <span className="text-accent">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {cta.href ? (
          <Link
            href={cta.href}
            className={`inline-block w-full rounded-full px-5 py-3 text-center text-sm font-medium ${
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
