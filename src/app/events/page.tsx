import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { PageHeader, Card } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/data";
import { getBusinessEvents } from "@/lib/data/events";
import { SEED_BUSINESS_EVENTS } from "@/lib/mock-data";
import {
  DISCOVERY_FILTER_OPTIONS,
  DISCOVERY_RADIUS_LABELS,
  discoveryFilterHrefValue,
  resolveDiscoveryFilter,
} from "@/lib/feed/location-scope";
import { INDUSTRY_OPTIONS, isIndustryOption } from "@/lib/industries";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    miles?: string;
    near?: string;
    q?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const userId = await getAuthUserId();
  const discoveryFilter = resolveDiscoveryFilter(
    params.near ?? params.miles ?? params.scope,
    profile?.discoveryRadius,
  );
  const query = params.q ?? "";
  const categoryFilter = isIndustryOption(params.category ?? "") ? params.category : undefined;

  const viewer = profile
    ? {
        city: profile.city,
        state: profile.state,
        county: profile.county,
        zipCode: profile.zipCode,
        country: profile.country,
        latitude: profile.latitude,
        longitude: profile.longitude,
        industryInterests: profile.industryInterests,
      }
    : null;

  const dbEvents = await getBusinessEvents({
    viewer,
    discoveryRadius: discoveryFilter,
    query: query || undefined,
    category: categoryFilter,
    userId,
    limit: 60,
  });
  const events = dbEvents.length > 0 ? dbEvents : SEED_BUSINESS_EVENTS;

  function buildHref(next: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = {
      q: query || undefined,
      category: categoryFilter,
      near: discoveryFilterHrefValue(discoveryFilter),
      ...next,
    };

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `/events?${qs}` : "/events";
  }

  const isBusinessAccount = profile?.role === "business" || profile?.role === "organization";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Local events"
        description="Discover events hosted by businesses near you. Events are published by local businesses — customers can RSVP, save events, and leave comments."
        action={
          isBusinessAccount ? (
            <Link
              href="/dashboard/events"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Publish event
            </Link>
          ) : profile ? (
            <Link
              href="/home"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Back to home
            </Link>
          ) : undefined
        }
      />

      <form action="/events" method="get" className="mb-4 flex flex-col gap-3 sm:flex-row">
        {discoveryFilterHrefValue(discoveryFilter) && (
          <input type="hidden" name="near" value={discoveryFilterHrefValue(discoveryFilter)} />
        )}
        {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search events by name, business, or location..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      <section className="mb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Near</span>
          {DISCOVERY_FILTER_OPTIONS.map((option) => (
            <Link key={option} href={buildHref({ near: discoveryFilterHrefValue(option) })}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${discoveryFilter === option ? "bg-accent text-white" : "border border-border bg-card text-muted hover:text-foreground"}`}>
              {DISCOVERY_RADIUS_LABELS[option]}
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Industry</span>
          <Link href={buildHref({ category: undefined })}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${!categoryFilter ? "bg-accent text-white" : "border border-border bg-card text-muted hover:text-foreground"}`}>
            All industries
          </Link>
          {INDUSTRY_OPTIONS.map((category) => (
            <Link key={category} href={buildHref({ category })}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${categoryFilter === category ? "bg-accent text-white" : "border border-border bg-card text-muted hover:text-foreground"}`}>
              {category}
            </Link>
          ))}
        </div>
      </section>

      {events.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No upcoming events match your filters.{" "}
            {isBusinessAccount ? (
              <>
                <Link href="/dashboard/events" className="text-accent hover:underline">
                  Publish an event
                </Link>{" "}
                from your dashboard.
              </>
            ) : (
              <>
                Try widening your distance or{" "}
                <Link href="/listings" className="text-accent hover:underline">
                  follow businesses
                </Link>{" "}
                to hear about new events.
              </>
            )}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
