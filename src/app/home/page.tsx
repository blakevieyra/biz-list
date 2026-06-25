import Link from "next/link";
import { redirect } from "next/navigation";
import { CollaborationCard } from "@/components/collaboration-card";
import { EventCard } from "@/components/event-card";
import { FeedPostCard } from "@/components/feed-post-card";
import { BusinessListingCard } from "@/components/business-listing-card";
import {
  AlertsPreview,
  ApplicationsList,
  FollowingList,
  MessagesPreview,
  ProfileHubNav,
  type HubTab,
} from "@/components/profile-hub-sections";
import { ProfilePlansPanel } from "@/components/profile-plans-panel";
import { ProfilePreferencesPanel } from "@/components/profile-preferences-panel";
import { BusinessGrowthHub } from "@/components/business-growth-hub";
import { HomeHubNav, type HomeTab } from "@/components/home-hub-nav";
import { CustomerProUpsell } from "@/components/customer-pro-upsell";
import { PageHeader, Card } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import {
  getBusinesses,
  getCollaborations,
  getCurrentProfile,
  getFollowedBusinesses,
  getNotifications,
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "@/lib/data";
import { getFeedBusinessPosts, getJobApplicationsForApplicant, getLatestPostsForBusinessIds } from "@/lib/data/business";
import { getBusinessEvents } from "@/lib/data/events";
import { getLatestAiAssessment, getLocalLeads } from "@/lib/data/pro";
import { getConversations } from "@/lib/data/messages";
import {
  AREA_SCOPE_LABELS,
  AREA_SCOPE_OPTIONS,
  DEFAULT_DISCOVERY_RADIUS,
  DEFAULT_MILE_RADIUS,
  MILE_RADIUS_LABELS,
  MILE_RADIUS_OPTIONS,
  resolveAreaScope,
  resolveMileRadius,
} from "@/lib/feed/location-scope";
import {
  INDUSTRY_OPTIONS,
  getSubcategories,
  isIndustryOption,
  isValidSubcategory,
} from "@/lib/industries";
import { canAccess, canAccessCustomerFeature } from "@/lib/plans";

const homeTabs = new Set<HomeTab>(["latest", "listings", "collaboration", "profile"]);
const profileTabs = new Set<HubTab>([
  "overview",
  "plans",
  "following",
  "applications",
  "messages",
  "alerts",
  "growth",
]);

export default async function HomeHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    profileTab?: string;
    scope?: string;
    miles?: string;
    q?: string;
    category?: string;
    subcategory?: string;
  }>;
}) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const params = await searchParams;
  if (!params.tab) {
    redirect("/home?tab=latest");
  }

  const tab: HomeTab = homeTabs.has(params.tab as HomeTab)
    ? (params.tab as HomeTab)
    : "latest";
  const profileTab: HubTab = profileTabs.has(params.profileTab as HubTab)
    ? (params.profileTab as HubTab)
    : "overview";

  const areaScope = resolveAreaScope(params.scope, profile.discoveryRadius ?? profile.feedScope);
  const mileRadius = resolveMileRadius(params.miles) ?? DEFAULT_MILE_RADIUS;
  const query = params.q ?? "";
  const categoryFilter = isIndustryOption(params.category ?? "") ? params.category : undefined;
  const subcategoryFilter =
    categoryFilter &&
    params.subcategory &&
    isValidSubcategory(categoryFilter, params.subcategory)
      ? params.subcategory
      : undefined;

  const viewer = {
    city: profile.city,
    state: profile.state,
    county: profile.county,
    zipCode: profile.zipCode,
    latitude: profile.latitude,
    longitude: profile.longitude,
    industryInterests: profile.industryInterests,
  };

  const isBusinessAccount = profile.role === "business" || profile.role === "organization";
  const isCustomerPro = canAccessCustomerFeature(profile.planTier, "jobAlerts");

  const [
    feedPosts,
    businesses,
    collaborations,
    events,
    following,
    applications,
    conversations,
    notifications,
    unreadMessages,
    unreadAlerts,
    latestAudit,
    leads,
  ] = await Promise.all([
    tab === "latest"
      ? getFeedBusinessPosts({ viewer, areaScope, mileRadius, userId, limit: 8 })
      : Promise.resolve([]),
    tab === "latest" || tab === "listings"
      ? getBusinesses({
          category: categoryFilter,
          subcategory: subcategoryFilter,
          query: query || undefined,
          areaScope,
          mileRadius,
          viewer,
        })
      : Promise.resolve([]),
    tab === "latest" || tab === "collaboration" ? getCollaborations() : Promise.resolve([]),
    tab === "latest"
      ? getBusinessEvents({ viewer, areaScope, mileRadius, userId, limit: 4 })
      : Promise.resolve([]),
    tab === "profile"
      ? getFollowedBusinesses(userId)
      : Promise.resolve([]),
    tab === "profile" && profile.role === "customer"
      ? getJobApplicationsForApplicant(userId)
      : Promise.resolve([]),
    tab === "profile" ? getConversations(userId) : Promise.resolve([]),
    tab === "profile" ? getNotifications(userId) : Promise.resolve([]),
    tab === "profile" ? getUnreadMessageCount(userId) : Promise.resolve(0),
    tab === "profile" ? getUnreadNotificationCount(userId) : Promise.resolve(0),
    tab === "profile" && isBusinessAccount && canAccess(profile.planTier, "aiAudit")
      ? getLatestAiAssessment(userId)
      : Promise.resolve(null),
    tab === "profile" && isBusinessAccount && canAccess(profile.planTier, "localLeads")
      ? getLocalLeads(userId)
      : Promise.resolve([]),
  ]);

  const listingBusinesses = tab === "listings" ? businesses : businesses.slice(0, 6);
  const latestPosts =
    tab === "latest" || tab === "listings"
      ? await getLatestPostsForBusinessIds(
          (tab === "listings" ? listingBusinesses : listingBusinesses.slice(0, 6)).map((b) => b.id),
        )
      : new Map();

  function buildHref(next: Record<string, string | undefined>) {
    const merged = {
      tab,
      profileTab: tab === "profile" && profileTab !== "overview" ? profileTab : undefined,
      scope: areaScope !== DEFAULT_DISCOVERY_RADIUS ? areaScope : undefined,
      miles: mileRadius !== DEFAULT_MILE_RADIUS ? mileRadius : undefined,
      q: query || undefined,
      category: categoryFilter,
      subcategory: subcategoryFilter,
      ...next,
    };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `/home?${qs}` : "/home?tab=latest";
  }

  const subcategories = categoryFilter ? getSubcategories(categoryFilter) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Welcome back, ${profile.displayName}`}
        description="Your local hub for latest updates, listings, collaboration, profile, and events."
        action={
          isBusinessAccount ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-accent"
            >
              Business dashboard
            </Link>
          ) : undefined
        }
      />

      <HomeHubNav active={tab} profileTab={tab === "profile" ? profileTab : undefined} />

      {profile.role === "customer" && !isCustomerPro && (
        <div className="mb-6">
          <CustomerProUpsell compact />
        </div>
      )}

      {(tab === "latest" || tab === "listings") && (
        <>
          <section className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Distance</p>
            <div className="flex flex-wrap gap-2">
              {MILE_RADIUS_OPTIONS.map((m) => (
                <Link
                  key={m}
                  href={buildHref({ miles: m === DEFAULT_MILE_RADIUS ? undefined : m })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    mileRadius === m
                      ? "bg-accent text-white"
                      : "border border-border bg-card text-muted hover:text-foreground"
                  }`}
                >
                  {MILE_RADIUS_LABELS[m]}
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Area</p>
            <div className="flex flex-wrap gap-2">
              {AREA_SCOPE_OPTIONS.map((s) => (
                <Link
                  key={s}
                  href={buildHref({ scope: s === DEFAULT_DISCOVERY_RADIUS ? undefined : s })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    areaScope === s
                      ? "bg-accent text-white"
                      : "border border-border bg-card text-muted hover:text-foreground"
                  }`}
                >
                  {AREA_SCOPE_LABELS[s]}
                </Link>
              ))}
            </div>
          </section>

          {tab === "listings" && (
            <section className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Industry</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildHref({ category: undefined, subcategory: undefined })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    !categoryFilter
                      ? "bg-accent text-white"
                      : "border border-border bg-card text-muted hover:text-foreground"
                  }`}
                >
                  All industries
                </Link>
                {INDUSTRY_OPTIONS.map((category) => (
                  <Link
                    key={category}
                    href={buildHref({ category, subcategory: undefined })}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      categoryFilter === category
                        ? "bg-accent text-white"
                        : "border border-border bg-card text-muted hover:text-foreground"
                    }`}
                  >
                    {category}
                  </Link>
                ))}
              </div>
              {subcategories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {subcategories.map((sub) => (
                    <Link
                      key={sub}
                      href={buildHref({ subcategory: sub })}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        subcategoryFilter === sub
                          ? "bg-accent text-white"
                          : "border border-border bg-card text-muted hover:text-foreground"
                      }`}
                    >
                      {sub}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {tab === "latest" && (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Latest posts</h2>
              <Link href="/feed" className="text-sm text-accent hover:underline">
                Full feed
              </Link>
            </div>
            {feedPosts.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">No posts in your area yet. Try widening your radius.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {feedPosts.map((post) => (
                  <FeedPostCard key={post.id} post={post} currentUserId={userId} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Nearby listings</h2>
              <Link href="/home?tab=listings" className="text-sm text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listingBusinesses.slice(0, 6).map((business) => (
                <BusinessListingCard
                  key={business.id}
                  business={business}
                  latestPosts={latestPosts.get(business.id) ?? []}
                  currentUserId={userId}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Collaboration</h2>
              <Link href="/home?tab=collaboration" className="text-sm text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {collaborations.slice(0, 4).map((item) => (
                <CollaborationCard key={item.id} idea={item} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Upcoming events</h2>
              <Link href="/events" className="text-sm text-accent hover:underline">
                All events
              </Link>
            </div>
            {events.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">No upcoming events nearby yet.</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "listings" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listingBusinesses.length === 0 ? (
            <Card className="sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted">No listings match your filters.</p>
            </Card>
          ) : (
            listingBusinesses.map((business) => (
              <BusinessListingCard
                key={business.id}
                business={business}
                latestPosts={latestPosts.get(business.id) ?? []}
                currentUserId={userId}
              />
            ))
          )}
        </div>
      )}

      {tab === "collaboration" && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <Link
              href="/partnerships/new"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Propose an idea
            </Link>
            <Link
              href="/partnerships"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Full collaboration board
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {collaborations.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">No collaboration ideas yet.</p>
              </Card>
            ) : (
              collaborations.map((item) => <CollaborationCard key={item.id} idea={item} />)
            )}
          </div>
        </>
      )}

      {tab === "profile" && (
        <>
          <ProfileHubNav
            active={profileTab}
            followingCount={following.length}
            applicationCount={applications.length}
            unreadMessages={unreadMessages}
            unreadAlerts={unreadAlerts}
            showGrowthTab={isBusinessAccount}
            leadCount={leads.length}
            basePath="/home?tab=profile"
          />

          {profileTab === "overview" && (
            <div className="space-y-6">
              <Card>
                <h2 className="font-semibold">{profile.displayName}</h2>
                <p className="mt-1 text-sm text-muted">
                  {profile.headline || profile.bio || "Complete your profile to get better matches."}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link href="/profile/edit" className="text-accent hover:underline">
                    Edit profile
                  </Link>
                  <Link href="/home?tab=profile&profileTab=following" className="text-accent hover:underline">
                    {following.length} following
                  </Link>
                  <Link href="/home?tab=profile&profileTab=messages" className="text-accent hover:underline">
                    Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ""}
                  </Link>
                  <Link href="/home?tab=profile&profileTab=alerts" className="text-accent hover:underline">
                    Alerts{unreadAlerts > 0 ? ` (${unreadAlerts})` : ""}
                  </Link>
                  <Link href="/home?tab=profile&profileTab=plans" className="text-accent hover:underline">
                    Plans & billing
                  </Link>
                </div>
              </Card>
              {isBusinessAccount ? (
                <BusinessGrowthHub planTier={profile.planTier} latestAudit={latestAudit} leads={leads} />
              ) : (
                <ProfilePreferencesPanel profile={profile} />
              )}
            </div>
          )}

          {profileTab === "plans" && (
            <ProfilePlansPanel role={profile.role} planTier={profile.planTier} />
          )}

          {profileTab === "growth" &&
            (isBusinessAccount ? (
              <BusinessGrowthHub planTier={profile.planTier} latestAudit={latestAudit} leads={leads} />
            ) : (
              <Card>
                <p className="text-sm text-muted">Growth tools are available on business accounts.</p>
              </Card>
            ))}

          {profileTab === "following" && <FollowingList businesses={following} />}
          {profileTab === "applications" &&
            (profile.role === "customer" ? (
              <ApplicationsList
                applications={applications}
                emptyLabel="You haven't applied to any jobs yet. Browse hiring businesses on Listings."
              />
            ) : (
              <Card>
                <p className="text-sm text-muted">
                  Job applications are for customer profiles.{" "}
                  <Link href="/dashboard/applications" className="text-accent hover:underline">
                    View applications to your business
                  </Link>
                </p>
              </Card>
            ))}
          {profileTab === "messages" && <MessagesPreview conversations={conversations} />}
          {profileTab === "alerts" && <AlertsPreview notifications={notifications} />}
        </>
      )}
    </div>
  );
}
