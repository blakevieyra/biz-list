import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { PageHeader, Card } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/data";
import { getBusinessEvents } from "@/lib/data/events";
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
import { INDUSTRY_OPTIONS, isIndustryOption } from "@/lib/industries";

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
  const areaScope = resolveAreaScope(params.scope, profile?.discoveryRadius ?? profile?.feedScope);
  const mileRadius = resolveMileRadius(params.miles) ?? DEFAULT_MILE_RADIUS;
  const query = params.q ?? "";
  const categoryFilter = isIndustryOption(params.category ?? "") ? params.category : undefined;

  const viewer = profile
    ? {
        city: profile.city,
        state: profile.state,
        county: profile.county,
        zipCode: profile.zipCode,
        latitude: profile.latitude,
        longitude: profile.longitude,
        industryInterests: profile.industryInterests,
      }
    : null;

  const events = await getBusinessEvents({
    viewer,
    areaScope,
    mileRadius,
    query: query || undefined,
    category: categoryFilter,
    userId,
    limit: 60,
  });

  function buildHref(next: Record<string, string | undefined>) {
    const merged = {
      scope: areaScope !== DEFAULT_DISCOVERY_RADIUS ? areaScope : undefined,
      miles: mileRadius !== DEFAULT_MILE_RADIUS ? mileRadius : undefined,
      q: query || undefined,
      category: categoryFilter,
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
        description="Discover events hosted by businesses near you. Mark going to save your spot and get reminders."
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
              href="/home?tab=latest"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Back to home
            </Link>
          ) : undefined
        }
      />

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

      <section className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Industry</p>
        <div className="flex flex-wrap gap-2">
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

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search events..."
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm"
        />
      </form>

      {events.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No upcoming events match your filters.</p>
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
