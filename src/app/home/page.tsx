import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ACTIVITY_TAB_POST_TYPES,
  ACTIVITY_TABS,
  ActivityFeedPanel,
  type ActivityTab,
} from "@/components/activity-feed-panel";
import { EventCard } from "@/components/event-card";
import { FavoriteBusinessCard } from "@/components/favorite-business-card";
import { HomeCardCarousel, HomeCarouselItem } from "@/components/home-card-carousel";
import { HomeHubNav } from "@/components/home-hub-nav";
import { CustomerProUpsell } from "@/components/customer-pro-upsell";
import { PageHeader, Card } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile, getFollowedBusinesses, getForumPosts } from "@/lib/data";
import { getFeedBusinessPosts } from "@/lib/data/business";
import { getBusinessEvents, getUserSavedEvents } from "@/lib/data/events";
import {
  resolveActiveDiscoveryFilter,
} from "@/lib/feed/location-scope";
import { canAccessCustomerFeature } from "@/lib/plans";
import type { ForumCategory } from "@/lib/types";

export default async function HomeHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    tab?: string;
    scope?: string;
    miles?: string;
    q?: string;
    category?: string;
  }>;
}) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const params = await searchParams;
  const view = params.view === "activity" ? "activity" : "overview";
  const activityTab: ActivityTab = ACTIVITY_TABS.some((t) => t.id === params.tab)
    ? (params.tab as ActivityTab)
    : "all";
  const discoveryRadius = resolveActiveDiscoveryFilter({
    miles: params.miles,
    scope: params.scope,
    profileDefault: profile.discoveryRadius,
  });
  const query = params.q ?? "";
  const categoryFilter = params.category as ForumCategory | undefined;

  const viewer = {
    city: profile.city,
    state: profile.state,
    county: profile.county,
    zipCode: profile.zipCode,
    country: profile.country,
    latitude: profile.latitude,
    longitude: profile.longitude,
    industryInterests: profile.industryInterests,
  };

  const isBusinessAccount = profile.role === "business" || profile.role === "organization";
  const isCustomerPro = canAccessCustomerFeature(profile.planTier, "jobAlerts");

  const [following, savedEvents, nearbyEvents, businessPosts, forumPosts] = await Promise.all([
    getFollowedBusinesses(userId),
    getUserSavedEvents(userId, 8),
    getBusinessEvents({ viewer, userId, limit: 8 }),
    view === "activity" && activityTab !== "discussions"
      ? getFeedBusinessPosts({
          viewer,
          discoveryRadius,
          userId,
          postTypes: ACTIVITY_TAB_POST_TYPES[activityTab],
          limit: 30,
        })
      : Promise.resolve([]),
    view === "activity" && activityTab === "discussions"
      ? getForumPosts(categoryFilter)
      : Promise.resolve([]),
  ]);

  const carouselEvents = savedEvents.length > 0 ? savedEvents : nearbyEvents;
  const eventsHeading = savedEvents.length > 0 ? "Your saved events" : "Events near you";

  function filterByQuery<T extends { title: string; body: string }>(
    items: T[],
    extra?: (item: T) => string,
  ) {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        (extra?.(item).toLowerCase().includes(q) ?? false),
    );
  }

  const posts = filterByQuery(businessPosts, (p) => p.businessName ?? "");
  const discussionPosts = filterByQuery(forumPosts, (p) => p.authorName);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Welcome back, ${profile.displayName}`}
        description={
          view === "activity"
            ? "Business posts and discussions filtered by distance and area near you."
            : "Saved events and businesses you follow — all in one place."
        }
        action={
          isBusinessAccount ? (
            <Link
              href="/dashboard/posts"
              className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-accent"
            >
              Create post
            </Link>
          ) : undefined
        }
      />

      {profile.role === "customer" && !isCustomerPro && view === "overview" && (
        <div className="mb-6">
          <CustomerProUpsell compact />
        </div>
      )}

      <HomeHubNav active={view} />

      {view === "activity" ? (
        <ActivityFeedPanel
          basePath="/home"
          tab={activityTab}
          discoveryRadius={discoveryRadius}
          milesParam={params.miles}
          scopeParam={params.scope}
          query={query}
          categoryFilter={categoryFilter}
          posts={posts}
          discussionPosts={discussionPosts}
          currentUserId={userId}
        />
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{eventsHeading}</h2>
              <Link href="/events" className="text-sm text-accent hover:underline">
                {savedEvents.length > 0 ? "Browse all events" : "Search events"}
              </Link>
            </div>
            {carouselEvents.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">
                  No upcoming events yet.{" "}
                  <Link href="/events" className="text-accent hover:underline">
                    Find events near you
                  </Link>{" "}
                  and RSVP to save them here.
                </p>
              </Card>
            ) : (
              <HomeCardCarousel>
                {carouselEvents.map((event) => (
                  <HomeCarouselItem key={event.id}>
                    <EventCard event={event} />
                  </HomeCarouselItem>
                ))}
              </HomeCardCarousel>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Favorite businesses</h2>
              <Link href="/profile?tab=following" className="text-sm text-accent hover:underline">
                View all
              </Link>
            </div>
            {following.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">
                  You&apos;re not following any businesses yet.{" "}
                  <Link href="/listings" className="text-accent hover:underline">
                    Browse listings
                  </Link>
                </p>
              </Card>
            ) : (
              <HomeCardCarousel>
                {following.slice(0, 8).map((business) => (
                  <HomeCarouselItem key={business.id}>
                    <FavoriteBusinessCard business={business} />
                  </HomeCarouselItem>
                ))}
              </HomeCardCarousel>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
