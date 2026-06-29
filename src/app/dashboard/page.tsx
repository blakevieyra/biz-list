import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { AiAuditPanel } from "@/components/ai-audit-panel";
import { LeadsPreviewPanel } from "@/components/leads-preview-panel";
import { PlatinumGrowthPanel } from "@/components/platinum-growth-panel";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessPosts, getServiceOrdersForBusiness } from "@/lib/data/business";
import { getBusinessById, getCurrentProfile } from "@/lib/data";
import { getLatestAiAssessment, getLocalLeads } from "@/lib/data/pro";
import { getConversations } from "@/lib/data/messages";
import { getSavedItems } from "@/lib/data/saved-items";
import { canAccess } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getBusinessAffiliates, getMyAffiliations } from "@/lib/actions/affiliates";
import { AffiliatesPanel } from "@/components/affiliates-panel";

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

  const [posts, leads, latestAudit, conversations, orders, savedItems, affiliates] = await Promise.all([
    business ? getBusinessPosts(business.id) : Promise.resolve([]),
    isBusiness && canAccess(profile.planTier, "localLeads")
      ? getLocalLeads(userId)
      : Promise.resolve([]),
    isBusiness && canAccess(profile.planTier, "aiAudit")
      ? getLatestAiAssessment(userId)
      : Promise.resolve(null),
    getConversations(userId),
    business ? getServiceOrdersForBusiness(business.id, userId) : Promise.resolve([]),
    getSavedItems(userId),
    profile.role === "marketer"
      ? getMyAffiliations()
      : business
        ? getBusinessAffiliates(business.id)
        : Promise.resolve([]),
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

      {/* Row 1: Conversations · Business profile · Service orders · Posts & marketing */}
      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            {business ? (
              <>
                <p className="mt-2 text-sm text-muted">{business.name}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span><span className="font-semibold">{business.followerIds.length}</span> <span className="text-muted">followers</span></span>
                  <span><span className="font-semibold">{business.likeCount}</span> <span className="text-muted">likes</span></span>
                  <span><span className="font-semibold">{business.ratingCount}</span> <span className="text-muted">reviews</span></span>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <Link href={`/listings/${business.id}`} className="text-accent hover:underline">
                    View public listing →
                  </Link>
                  <Link href="/dashboard/profile" className="text-accent hover:underline">
                    Edit listing →
                  </Link>
                  {business.isHiring && (
                    <Link href="/dashboard/applications" className="text-accent hover:underline">
                      Job applications →
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted">Complete your business profile to appear in listings.</p>
                <Link href="/profile/create" className="mt-4 inline-block text-sm text-accent hover:underline">
                  Complete onboarding →
                </Link>
              </>
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

        {/* Affiliates panel */}
        <AffiliatesPanel
          affiliates={affiliates}
          isMarketer={profile.role === "marketer"}
          businessId={business?.id}
        />

        {/* Service orders */}
        {isBusiness && business ? (() => {
          const pending = orders.filter((o) => o.status === "pending").length;
          const total = orders.length;
          return (
            <Card>
              <h2 className="font-semibold">Service orders</h2>
              <p className="mt-3 text-3xl font-bold">{total}</p>
              <p className="text-xs text-muted">total orders</p>
              {pending > 0 && (
                <p className="mt-1 text-sm font-medium text-amber-700">
                  {pending} pending review
                </p>
              )}
              {total > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {orders.slice(0, 3).map((o) => (
                    <li key={o.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted">{o.serviceName}</span>
                      <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        o.status === "pending" ? "bg-amber-100 text-amber-800"
                        : o.status === "accepted" ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                      }`}>{o.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">No orders yet.</p>
              )}
              <Link href="/dashboard/orders" className="mt-4 inline-block text-sm text-accent hover:underline">
                Manage orders →
              </Link>
            </Card>
          );
        })() : isBusiness ? (
          <Card>
            <h2 className="font-semibold">Service orders</h2>
            <p className="mt-2 text-sm text-muted">Set up your listing to start receiving service orders.</p>
            <Link href="/dashboard/profile" className="mt-4 inline-block text-sm text-accent hover:underline">
              Set up listing →
            </Link>
          </Card>
        ) : null}

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

      {/* Saved & interested */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Saved & interested</h2>
            <p className="mt-0.5 text-xs text-muted">Events, listings, proposals, and opportunities you bookmarked.</p>
          </div>
        </div>
        {savedItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedItems.slice(0, 9).map((item) => {
              const typeColor: Record<string, string> = {
                listing: "bg-blue-50 text-blue-700",
                event: "bg-purple-50 text-purple-700",
                collaboration: "bg-emerald-50 text-emerald-700",
                proposal: "bg-amber-50 text-amber-700",
                contract: "bg-orange-50 text-orange-700",
                post: "bg-slate-100 text-slate-600",
                person: "bg-pink-50 text-pink-700",
              };
              const typeLabel: Record<string, string> = {
                listing: "Listing",
                event: "Event",
                collaboration: "Collaboration",
                proposal: "Proposal",
                contract: "Contract",
                post: "Post",
                person: "Person",
              };
              const typeIcon: Record<string, string> = {
                listing: "🏢",
                event: "📅",
                collaboration: "🤝",
                proposal: "📋",
                contract: "📝",
                post: "💬",
                person: "👤",
              };
              const content = (
                <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-accent/40 hover:shadow-md">
                  {/* Image or placeholder */}
                  {item.itemImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.itemImageUrl}
                      alt={item.itemTitle}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-4xl">
                      {typeIcon[item.itemType] ?? "📌"}
                    </div>
                  )}
                  <div className="p-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[item.itemType] ?? "bg-slate-100 text-slate-600"}`}>
                      {typeLabel[item.itemType] ?? item.itemType}
                    </span>
                    <p className="mt-2 text-base font-semibold leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {item.itemTitle}
                    </p>
                    {item.itemSubtitle && (
                      <p className="mt-1 text-xs font-medium text-muted line-clamp-1">{item.itemSubtitle}</p>
                    )}
                    {item.itemDescription && (
                      <p className="mt-1.5 text-xs text-muted line-clamp-2">{item.itemDescription}</p>
                    )}
                    <p className="mt-3 text-[11px] text-muted/70">
                      Saved {new Date(item.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              );
              return item.itemUrl ? (
                <Link key={item.id} href={item.itemUrl} className="block">
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-muted">
              Nothing saved yet. Hit <strong>Save</strong> on any listing, event, or collaboration to pin it here.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
