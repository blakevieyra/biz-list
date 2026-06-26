import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { AiAuditPanel } from "@/components/ai-audit-panel";
import { LeadsPreviewPanel } from "@/components/leads-preview-panel";
import { PlatinumGrowthPanel } from "@/components/platinum-growth-panel";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessPosts } from "@/lib/data/business";
import { getBusinessById, getCurrentProfile } from "@/lib/data";
import { getLatestAiAssessment, getLocalLeads } from "@/lib/data/pro";
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

  const [posts, leads, latestAudit, conversations] = await Promise.all([
    business ? getBusinessPosts(business.id) : Promise.resolve([]),
    isBusiness && canAccess(profile.planTier, "localLeads")
      ? getLocalLeads(userId)
      : Promise.resolve([]),
    isBusiness && canAccess(profile.planTier, "aiAudit")
      ? getLatestAiAssessment(userId)
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

      {/* Row 1: Conversations · Business profile · Posts & marketing */}
      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Conversations */}
        <Card>
          <div className="flex items-start justify-between">
            <h2 className="font-semibold">Messages & inbox</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="mt-4 text-3xl font-bold">{conversations.length}</p>
          <p className="text-xs text-muted">conversations</p>
          {conversations.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {conversations.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/messages/${c.id}`}
                    className="flex items-center justify-between text-sm hover:text-accent"
                  >
                    <span className={c.unreadCount > 0 ? "font-semibold" : ""}>{c.otherUserName}</span>
                    {c.unreadCount > 0 && (
                      <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-xs font-bold text-accent">
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
          <Link href="/messages" className="mt-4 inline-block text-sm text-accent hover:underline">
            Open inbox →
          </Link>
        </Card>

        {/* Business profile */}
        {isBusiness ? (
          <Card>
            <h2 className="font-semibold">Business profile</h2>
            <p className="mt-2 text-sm text-muted">
              {business
                ? `${business.name} · ${business.likeCount} likes · ${business.ratingCount} reviews`
                : "Complete your business profile to appear in listings."}
            </p>
            {business ? (
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
            ) : (
              <Link href="/profile/create" className="mt-4 inline-block text-sm text-accent hover:underline">
                Complete onboarding →
              </Link>
            )}
          </Card>
        ) : (
          <Card>
            <h2 className="font-semibold">Discover businesses</h2>
            <p className="mt-2 text-sm text-muted">
              Browse local listings, follow businesses, and connect with your community.
            </p>
            <Link href="/listings" className="mt-4 inline-block text-sm text-accent hover:underline">
              Browse listings →
            </Link>
          </Card>
        )}

        {/* Posts & marketing */}
        {isBusiness && canAccess(profile.planTier, "businessPosts") ? (
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
        ) : !isBusiness ? (
          <Card>
            <h2 className="font-semibold">Community forum</h2>
            <p className="mt-2 text-sm text-muted">
              Post questions, share tips, and engage with local businesses and neighbors.
            </p>
            <Link href="/forum" className="mt-4 inline-block text-sm text-accent hover:underline">
              Open forum →
            </Link>
          </Card>
        ) : null}
      </div>

      {/* Row 2: AI tools & growth (business only) */}
      {isBusiness && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AiAuditPanel planTier={profile.planTier} latest={latestAudit} compact />
          <LeadsPreviewPanel planTier={profile.planTier} leads={leads} limit={3} />
          <PlatinumGrowthPanel planTier={profile.planTier} />
        </div>
      )}
    </>
  );
}
