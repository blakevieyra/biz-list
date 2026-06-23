import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getAiAssessments, getLocalLeads } from "@/lib/data/pro";
import { getCurrentProfile } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";

export default async function ProDashboardPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile || profile.planTier !== "pro") redirect("/pricing");

  const [leads, assessments] = await Promise.all([
    getLocalLeads(userId),
    getAiAssessments(userId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Pro Dashboard"
        description="AI growth insights and local leads matched to your business and area."
      />

      <div className="mb-8 rounded-2xl border border-accent/30 bg-teal-50 p-5">
        <p className="text-sm">
          <span className="font-semibold">Pro member</span> — {profile.displayName}
          {profile.city && profile.state
            ? ` · ${profile.city}, ${profile.state}`
            : ""}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">AI Business Assessment</h2>
          <p className="mt-2 text-sm text-muted">
            Get scores and recommendations for your website SEO, online presence, and business
            messaging.
          </p>
          <p className="mt-4 text-3xl font-bold">{assessments.length}</p>
          <p className="text-sm text-muted">assessments run</p>
          <Link
            href="/pro/assessment"
            className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Run assessment
          </Link>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Local Leads</h2>
          <p className="mt-2 text-sm text-muted">
            Customers in your area whose interests match your category and local activity.
          </p>
          <p className="mt-4 text-3xl font-bold">{leads.length}</p>
          <p className="text-sm text-muted">matched leads available</p>
          <Link
            href="/pro/leads"
            className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            View leads
          </Link>
        </Card>
      </div>
    </div>
  );
}
