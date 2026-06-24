import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessGrowthHub } from "@/components/business-growth-hub";
import { BusinessProfileEditor } from "@/components/business-profile-editor";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessByOwnerId, getCurrentProfile } from "@/lib/data";
import { getLatestAiAssessment, getLocalLeads } from "@/lib/data/pro";
import { canAccess } from "@/lib/plans";

export default async function DashboardProfilePage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const business = await getBusinessByOwnerId(userId);

  if (!business) {
    return (
      <>
        <PageHeader
          title="Business profile"
          description="Set up your listing to manage products, photos, and directory details."
        />
        <p className="text-sm text-muted">
          You don&apos;t have a business listing yet.{" "}
          <Link href="/profile/create" className="text-accent hover:underline">
            Complete onboarding
          </Link>{" "}
          to create one.
        </p>
      </>
    );
  }

  const [latestAudit, leads] = await Promise.all([
    canAccess(profile.planTier, "aiAudit") ? getLatestAiAssessment(userId) : Promise.resolve(null),
    canAccess(profile.planTier, "localLeads") ? getLocalLeads(userId) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Business profile"
        description="Your listing, growth tools, AI audit scores, and matched leads."
        action={
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Plans & billing
          </Link>
        }
      />

      <div className="mb-8">
        <BusinessGrowthHub planTier={profile.planTier} latestAudit={latestAudit} leads={leads} />
      </div>

      <BusinessProfileEditor business={business} displayName={profile.displayName} />
    </>
  );
}
