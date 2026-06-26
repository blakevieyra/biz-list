import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { BusinessGrowthHub } from "@/components/business-growth-hub";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessPosts } from "@/lib/data/business";
import { getBusinessById, getCurrentProfile } from "@/lib/data";
import { getAiAssessments, getLatestAiAssessment, getLocalLeads } from "@/lib/data/pro";
import { getBusinessAnalytics } from "@/lib/data/analytics";
import { getConversations } from "@/lib/data/messages";
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

  const isBusiness = profile.role !== "customer";

  const businessRow = isBusiness ? await getOwnerBusiness(userId) : null;
  const business = businessRow ? await getBusinessById(businessRow.id) : null;

  const [posts, leads, latestAudit, allAssessments, analytics, conversations] =
    await Promise.all([
      business ? getBusinessPosts(business.id) : Promise.resolve([]),
      isBusiness && canAccess(profile.planTier, "localLeads")
        ? getLocalLeads(userId)
        : Promise.resolve([]),
      isBusiness && canAccess(profile.planTier, "aiAudit")
        ? getLatestAiAssessment(userId)
        : Promise.resolve(null),
      isBusiness && canAccess(profile.planTier, "aiAudit")
        ? getAiAssessments(userId)
        : Promise.resolve([]),
      canAccess(profile.planTier, "analytics") && business
        ? getBusinessAnalytics(business.id)
        : Promise.resolve(null),
      getConversations(userId),
    ]);

  const unreadCount = conversations.reduce((n, c) => n + c.unreadCount, 0);

  return (
    <>
      <PageHeader
        title="Overview"
        description={
          isBusiness
            ? "Your hub for marketing, networking, and growing locally on BizList."
            : "Your messages, activity, and community connections."
        }
      />

      {/* Messages & Inbox */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Messages & Inbox</h2>
          <Link href="/messages" className="text-sm text-accent hover:underline">
            Open inbox →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <div className="flex items-start justify-between">
              <h3 className="font-medium">Conversations</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="mt-2 text-3xl font-bold">{conversations.length}</p>
            {conversations.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {conversations.slice(0, 3).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/messages/${c.id}`}
                      className="flex items-center justify-between text-sm hover:text-accent"
                    >
                      <span className={c.unreadCount > 0 ? "font-semibold" : ""}>
                        {c.otherUserName}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="ml-2 rounded-full bg-accent/10 px-1.5 py-0.5 text-xs font-bold text-accent">
                          {c.unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No conversations yet.</p>
            )}
            <Link
              href="/messages"
              className="mt-4 inline-block text-sm text-accent hover:underline"
            >
              View all messages →
            </Link>
          </Card>
        </div>
      </section>

      {/* AI tools & growth (business roles only) */}
      {isBusiness && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold">AI tools & growth</h2>
          <BusinessGrowthHub
            planTier={profile.planTier}
            latestAudit={latestAudit}
            leads={leads}
          />
        </section>
      )}

      {/* Business activity cards */}
      {isBusiness && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Business activity</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <h3 className="font-semibold">Business profile</h3>
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
                <h3 className="font-semibold">Posts & marketing</h3>
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

            {analytics && (
              <Card>
                <h3 className="font-semibold">Page views</h3>
                <p className="mt-4 text-3xl font-bold">{analytics.views7d}</p>
                <p className="text-xs text-muted">last 7 days</p>
                <div className="mt-2 flex gap-4 text-xs text-muted">
                  <span>{analytics.views30d} this month</span>
                  <span>{analytics.viewsAllTime} total</span>
                </div>
                <Link href="/dashboard/analytics" className="mt-4 inline-block text-sm text-accent hover:underline">
                  Full analytics →
                </Link>
              </Card>
            )}
          </div>
        </section>
      )}
    </>
  );
}
