import Link from "next/link";
import { redirect } from "next/navigation";
import { EventCard } from "@/components/event-card";
import { FavoriteBusinessCard } from "@/components/favorite-business-card";
import { FeedPostCard } from "@/components/feed-post-card";
import { HomeCardCarousel, HomeCarouselItem } from "@/components/home-card-carousel";
import { CustomerProUpsell } from "@/components/customer-pro-upsell";
import { PageHeader, Card } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile, getFollowedBusinesses } from "@/lib/data";
import { getFeedBusinessPosts } from "@/lib/data/business";
import { getBusinessEvents, getUserSavedEvents } from "@/lib/data/events";
import { canAccessCustomerFeature } from "@/lib/plans";

export default async function HomeHubPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

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

  const [feedPosts, following, savedEvents, nearbyEvents] = await Promise.all([
    getFeedBusinessPosts({ viewer, userId, limit: 4 }),
    getFollowedBusinesses(userId),
    getUserSavedEvents(userId, 8),
    getBusinessEvents({ viewer, userId, limit: 8 }),
  ]);

  const carouselEvents = savedEvents.length > 0 ? savedEvents : nearbyEvents;
  const eventsHeading = savedEvents.length > 0 ? "Your saved events" : "Events near you";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Welcome back, ${profile.displayName}`}
        description="Saved events, recent posts, and businesses you follow — all in one place."
        action={
          isBusinessAccount ? (
            <Link
              href="/dashboard/posts"
              className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-accent"
            >
              Create post
            </Link>
          ) : (
            <Link
              href="/feed"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Full feed
            </Link>
          )
        }
      />

      {profile.role === "customer" && !isCustomerPro && (
        <div className="mb-6">
          <CustomerProUpsell compact />
        </div>
      )}

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
            <h2 className="text-lg font-semibold">Recent</h2>
            <Link href="/feed" className="text-sm text-accent hover:underline">
              All posts
            </Link>
          </div>
          {feedPosts.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">
                No recent posts nearby yet.{" "}
                <Link href="/listings" className="text-accent hover:underline">
                  Browse listings
                </Link>{" "}
                or widen your discovery radius in profile settings.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {feedPosts.map((post) => (
                <FeedPostCard key={post.id} post={post} currentUserId={userId} />
              ))}
            </div>
          )}

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Favorite businesses</h3>
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
          </div>
        </section>
      </div>
    </div>
  );
}
