import Link from "next/link";
import { redirect } from "next/navigation";
import { JobListingEditor } from "@/components/job-listing-editor";
import { JobApplicationsPanel } from "@/components/job-applications-panel";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessByOwnerId } from "@/lib/data";
import { getJobApplicationsForBusiness } from "@/lib/data/business";

export default async function DashboardJobsPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const business = await getBusinessByOwnerId(userId);
  if (!business) {
    return (
      <>
        <PageHeader
          title="Jobs"
          description="Complete your business profile to manage your job listing."
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
        title="Jobs"
        description={`Manage your job listing and review applications for ${business.name}.`}
      />
      <div className="space-y-8">
        <JobListingEditor business={business} />
        <JobApplicationsPanel applications={applications} businessId={business.id} />
      </div>
    </>
  );
}
