import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { PageHeader, Card } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/data";
import { getBusinessEvents } from "@/lib/data/events";
import {
  AREA_SCOPE_LABELS,
  AREA_SCOPE_OPTIONS,
  isAreaFilterActive,
  isMileFilterActive,
  MILE_RADIUS_LABELS,
  MILE_RADIUS_OPTIONS,
  resolveActiveDiscoveryFilter,
} from "@/lib/feed/location-scope";
import { INDUSTRY_OPTIONS, isIndustryOption } from "@/lib/industries";
import type { AreaScope, MileRadius } from "@/lib/types";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    miles?: string;
    q?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const userId = await getAuthUserId();
  const discoveryRadius = resolveActiveDiscoveryFilter({
    miles: params.miles,
    scope: params.scope,
    profileDefault: profile?.discoveryRadius ?? profile?.feedScope,
  });
  const query = params.q ?? "";
  const categoryFilter = isIndustryOption(params.category ?? "") ? params.category : undefined;
  const mileMode = isMileFilterActive(params.miles, params.scope);
  const areaMode = isAreaFilterActive(params.miles, params.scope);

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

  const events = await getBusinessEvents({
    viewer,
    discoveryRadius,
    query: query || undefined,
    category: categoryFilter,
    userId,
    limit: 60,
  });

  function buildHref(next: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = {
      scope: params.scope,
      miles: params.miles,
      q: query || undefined,
      category: categoryFilter,
      ...next,
    };
    if (next.miles === "") merged.miles = undefined;
    if (next.scope === "") merged.scope = undefined;

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `/events?${qs}` : "/events";
  }

  function mileIsActive(m: MileRadius): boolean {
    if (mileMode) return params.miles === m;
    if (!areaMode && !params.miles && !params.scope) return discoveryRadius === m;
    return false;
  }

  function areaIsActive(s: AreaScope): boolean {
    if (areaMode) return params.scope === s;
    if (!mileMode && !params.miles && !params.scope) return discoveryRadius === s;
    return false;
  }

  const isBusinessAccount = profile?.role === "business" || profile?.role === "organization";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Local events"
        description="Discover events hosted by businesses near you. Mark going to save your spot and comment with questions."
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

      {!isBusinessAccount && (
        <p className="mb-4 text-sm text-muted">
          Events are published by local businesses. Customers can RSVP, save events, and leave comments.
        </p>
      )}

      <section className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Distance</p>
        <div className="filter-scroll">
          {MILE_RADIUS_OPTIONS.map((m) => (
            <Link
              key={m}
              href={buildHref({ miles: m, scope: "" })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                mileIsActive(m)
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
        <div className="filter-scroll">
          {AREA_SCOPE_OPTIONS.map((s) => (
            <Link
              key={s}
              href={buildHref({ scope: s, miles: "" })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                areaIsActive(s)
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {AREA_SCOPE_LABELS[s]}
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Industry</p>
        <div className="filter-scroll">
          <Link
            href={buildHref({ category: undefined })}
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
              href={buildHref({ category })}
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
      </section>

      <form action="/events" method="get" className="mb-6 flex flex-col gap-3 sm:flex-row">
        {params.scope && <input type="hidden" name="scope" value={params.scope} />}
        {params.miles && <input type="hidden" name="miles" value={params.miles} />}
        {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search events by name, business, or location..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

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
