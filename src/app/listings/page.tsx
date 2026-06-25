import Link from "next/link";
import { BusinessListingCard } from "@/components/business-listing-card";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinesses, getCurrentProfile } from "@/lib/data";
import { getLatestPostsForBusinessIds } from "@/lib/data/business";
import {
  DISCOVERY_FILTER_OPTIONS,
  DISCOVERY_RADIUS_LABELS,
  discoveryFilterHrefValue,
  resolveDiscoveryFilter,
} from "@/lib/feed/location-scope";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    near?: string;
    scope?: string;
    miles?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const userId = await getAuthUserId();
  const query = params.q ?? "";
  const discoveryFilter = resolveDiscoveryFilter(
    params.near ?? params.miles ?? params.scope,
    profile?.discoveryRadius ?? profile?.feedScope,
  );

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

  const businesses = await getBusinesses({
    query: query || undefined,
    discoveryRadius: discoveryFilter,
    viewer,
  });

  const latestPosts = await getLatestPostsForBusinessIds(businesses.map((b) => b.id));

  function buildHref(next: Record<string, string | undefined>) {
    const merged = {
      q: query || undefined,
      near: discoveryFilterHrefValue(discoveryFilter),
      ...next,
    };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `/listings?${qs}` : "/listings";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Listings"
        description="Browse local businesses ranked nearest and most relevant to you."
        action={
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Open feed →
          </Link>
        }
      />

      {!profile && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Link href="/auth/signup" className="font-medium underline">
            Create a profile
          </Link>{" "}
          with your location to personalize listings near you.
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Near
          </span>
          {DISCOVERY_FILTER_OPTIONS.map((option) => (
            <Link
              key={option}
              href={buildHref({ near: discoveryFilterHrefValue(option) })}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${
                discoveryFilter === option
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {DISCOVERY_RADIUS_LABELS[option]}
            </Link>
          ))}
        </div>
      </div>

      <form className="mb-8 flex flex-col gap-3 sm:flex-row">
        {discoveryFilterHrefValue(discoveryFilter) && (
          <input type="hidden" name="near" value={discoveryFilterHrefValue(discoveryFilter)} />
        )}
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by name, type, city, or zip..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      {businesses.length === 0 ? (
        <p className="text-muted">
          No businesses found in this area. Try expanding your distance or choosing a different
          filter.
        </p>
      ) : (
        <div className="grid auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <BusinessListingCard
              key={business.id}
              business={business}
              latestPosts={latestPosts.get(business.id) ?? []}
              currentUserId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
