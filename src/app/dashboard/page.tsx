import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessPosts } from "@/lib/data/business";
import { getBusinessById, getCurrentProfile } from "@/lib/data";
import { getAiAssessments, getLocalLeads } from "@/lib/data/pro";
import { canAccess } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

async function getOwnerBusiness(userId: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  return data;
}

export default async function DashboardPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const businessRow = await getOwnerBusiness(userId);
  const business = businessRow ? await getBusinessById(businessRow.id) : null;
  const posts = business ? await getBusinessPosts(business.id) : [];

  const [leads, assessments] = await Promise.all([
    canAccess(profile.planTier, "localLeads") ? getLocalLeads(userId) : Promise.resolve([]),
    canAccess(profile.planTier, "aiAudit") ? getAiAssessments(userId) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Your hub for marketing, networking, and growing locally on AllConnect."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Business profile</h2>
          <p className="mt-2 text-sm text-muted">
            {business
              ? `${business.name} · ${business.likeCount} likes · ${business.ratingCount} reviews`
              : "Complete your business profile to appear in listings."}
          </p>
          {business && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href={`/listings/${business.id}`} className="text-accent hover:underline">
                View public listing →
              </Link>
              <Link href="/dashboard/profile" className="text-accent hover:underline">
                Edit listing →
              </Link>
              <Link href="/dashboard/orders" className="text-accent hover:underline">
                Service orders →
              </Link>
              {business.isHiring && (
                <Link href="/dashboard/applications" className="text-accent hover:underline">
                  Job applications →
                </Link>
              )}
            </div>
          )}
        </Card>

        {canAccess(profile.planTier, "businessPosts") && (
          <Card>
            <h2 className="font-semibold">Posts & marketing</h2>
            <p className="mt-2 text-sm text-muted">
              {posts.length > 0
                ? `${posts.length} published post${posts.length === 1 ? "" : "s"} on your feed.`
                : "Publish updates, jobs, deals, and video to reach local customers."}
            </p>
            <Link
              href="/dashboard/posts"
              className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Create content →
            </Link>
          </Card>
        )}

        {canAccess(profile.planTier, "localLeads") && (
          <Card>
            <h2 className="font-semibold">Local leads</h2>
            <p className="mt-4 text-3xl font-bold">{leads.length}</p>
            <Link href="/dashboard/leads" className="mt-4 inline-block text-sm text-accent hover:underline">
              View leads →
            </Link>
          </Card>
        )}

        {canAccess(profile.planTier, "aiAudit") && (
          <Card>
            <h2 className="font-semibold">AI audits</h2>
            <p className="mt-4 text-3xl font-bold">{assessments.length}</p>
            <Link href="/dashboard/assessment" className="mt-4 inline-block text-sm text-accent hover:underline">
              Run audit →
            </Link>
          </Card>
        )}
      </div>
    </>
  );
}
