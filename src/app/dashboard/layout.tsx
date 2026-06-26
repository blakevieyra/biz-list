import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/data";
import { canAccess, isBusinessPlan, PLAN_LABELS, type PlanFeature } from "@/lib/plans";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/messages", label: "Messages" },
  { href: "/dashboard/posts", label: "Posts & marketing" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/leads", label: "Leads", feature: "localLeads" as const },
  { href: "/dashboard/analytics", label: "Analytics", feature: "analytics" as const },
  { href: "/dashboard/assessment", label: "AI Audit", feature: "aiAudit" as const },
  { href: "/dashboard/marketing", label: "Marketing", feature: "automatedMarketing" as const },
  { href: "/dashboard/agent", label: "Virtual Agent", feature: "virtualAgent" as const },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const isBusiness = profile.role !== "customer";

  const enabledFeatures: PlanFeature[] = navItems
    .filter((item) => item.feature && canAccess(profile.planTier, item.feature))
    .map((item) => item.feature!);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">{PLAN_LABELS[profile.planTier]} plan</p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {isBusiness ? "Business dashboard" : "My dashboard"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            {isBusiness
              ? "Manage posts, leads, growth tools, and your local network."
              : "Your messages, notifications, and community activity."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/messages"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Inbox
          </Link>
          {isBusiness && (
            <>
              {isBusinessPlan(profile.planTier) && <ManageBillingButton />}
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
              >
                {isBusinessPlan(profile.planTier) ? "Change plan" : "Upgrade"}
              </Link>
            </>
          )}
        </div>
      </div>

      <DashboardNav items={navItems} enabledFeatures={enabledFeatures} />

      {children}
    </div>
  );
}
