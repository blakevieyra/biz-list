import Link from "next/link";
import { redirect } from "next/navigation";
import { JobApplicationsPanel } from "@/components/job-applications-panel";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessByOwnerId, getCurrentProfile } from "@/lib/data";
import { getJobApplicationsForBusiness } from "@/lib/data/business";

export default async function DashboardApplicationsPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const business = await getBusinessByOwnerId(userId);
  if (!business) {
    return (
      <>
        <PageHeader
          title="Job applications"
          description="Complete your business profile to receive applications."
        />
        <p className="text-sm text-muted">
          <Link href="/dashboard/profile" className="text-accent hover:underline">
            Set up your business listing →
          </Link>
        </p>
      </>
    );
  }

  const applications = await getJobApplicationsForBusiness(business.id, userId);

  return (
    <>
      <PageHeader
        title="Job applications"
        description={`Review candidates who applied to ${business.name}.`}
        action={
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Back to dashboard
          </Link>
        }
      />
      <JobApplicationsPanel applications={applications} businessId={business.id} />
    </>
  );
}
