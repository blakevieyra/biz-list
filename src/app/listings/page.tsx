import Link from "next/link";
import { BusinessListingCard } from "@/components/business-listing-card";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinesses, getCurrentProfile } from "@/lib/data";
import { getLatestPostsForBusinessIds } from "@/lib/data/business";
import { getBusinessIdsWithEvents } from "@/lib/data/events";
import {
  DISCOVERY_FILTER_OPTIONS,
  DISCOVERY_RADIUS_LABELS,
  discoveryFilterHrefValue,
  resolveDiscoveryFilter,
} from "@/lib/feed/location-scope";
import { INDUSTRY_OPTIONS, isIndustryOption } from "@/lib/industries";

const RATING_OPTIONS = [
  { value: "4", label: "4★ & up" },
  { value: "3", label: "3★ & up" },
  { value: "2", label: "2★ & up" },
];

const STATUS_OPTIONS = [
  { value: "hiring", label: "Hiring" },
  { value: "deals", label: "Has deals" },
  { value: "events", label: "Has events" },
  { value: "b2b", label: "B2B" },
  { value: "contract", label: "Contract" },
  { value: "proposal", label: "Open to proposals" },
];

function filterChipClass(active: boolean) {
  return `rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${
    active
      ? "bg-accent text-white"
      : "border border-border bg-card text-muted hover:text-foreground"
  }`;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    near?: string;
    scope?: string;
    miles?: string;
    category?: string;
    rating?: string;
    status?: string;
  }>; // status: hiring | deals | events | b2b | contract | proposal
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const userId = await getAuthUserId();
  const query = params.q ?? "";
  const discoveryFilter = resolveDiscoveryFilter(
    params.near ?? params.miles ?? params.scope,
    profile?.discoveryRadius,
  );
  const categoryFilter = isIndustryOption(params.category ?? "") ? params.category : undefined;
  const minRating = ["2", "3", "4"].includes(params.rating ?? "") ? Number(params.rating) : null;
  const validStatuses = ["hiring", "deals", "events", "b2b", "contract", "proposal"] as const;
  type StatusFilter = typeof validStatuses[number];
  const statusFilter: StatusFilter | null = validStatuses.includes(params.status as StatusFilter)
    ? (params.status as StatusFilter)
    : null;

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

  // Push intent-based filters to the DB query to avoid over-fetching
  const intentFilter =
    statusFilter === "b2b" || statusFilter === "contract" || statusFilter === "proposal"
      ? statusFilter
      : undefined;

  const allBusinesses = await getBusinesses({
    query: query || undefined,
    category: categoryFilter,
    discoveryRadius: discoveryFilter,
    viewer,
    intent: intentFilter as import("@/lib/types").BusinessIntent | undefined,
  });

  const businessIds = allBusinesses.map((b) => b.id);
  const [latestPosts, businessIdsWithEvents] = await Promise.all([
    getLatestPostsForBusinessIds(businessIds, 10),
    getBusinessIdsWithEvents(businessIds),
  ]);

  // Apply rating + status filters after fetching (uses already-loaded data)
  const businesses = allBusinesses.filter((b) => {
    if (minRating !== null) {
      if (b.ratingCount === 0 || b.ratingAvg < minRating) return false;
    }
    // Hiring: use the explicit isHiring flag only — job posts alone don't qualify
    if (statusFilter === "hiring") {
      if (!b.isHiring) return false;
    }
    if (statusFilter === "deals") {
      const posts = latestPosts.get(b.id) ?? [];
      if (!posts.some((p) => p.postType === "deal")) return false;
    }
    if (statusFilter === "events") {
      if (!businessIdsWithEvents.has(b.id)) return false;
    }
    if (statusFilter === "b2b" && !b.intents.includes("b2b")) return false;
    if (statusFilter === "contract" && !b.intents.includes("contract")) return false;
    if (statusFilter === "proposal" && !b.intents.includes("proposal")) return false;
    return true;
  });

  function buildHref(next: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = {
      q: query || undefined,
      near: discoveryFilterHrefValue(discoveryFilter),
      category: categoryFilter,
      rating: minRating !== null ? String(minRating) : undefined,
      status: statusFilter ?? undefined,
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
      />

      {!profile && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Link href="/auth/signup" className="font-medium underline">
            Create a profile
          </Link>{" "}
          with your location to personalize listings near you.
        </p>
      )}

      <form action="/listings" method="get" className="mb-4 flex flex-col gap-3 sm:flex-row">
        {discoveryFilterHrefValue(discoveryFilter) && (
          <input type="hidden" name="near" value={discoveryFilterHrefValue(discoveryFilter)} />
        )}
        {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
        {minRating !== null && <input type="hidden" name="rating" value={String(minRating)} />}
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
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

      {/* Near */}
      <section className="mb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Near</span>
          {DISCOVERY_FILTER_OPTIONS.map((option) => (
            <Link key={option} href={buildHref({ near: discoveryFilterHrefValue(option) })}
              aria-current={discoveryFilter === option ? "true" : undefined}
              className={filterChipClass(discoveryFilter === option)}>
              {DISCOVERY_RADIUS_LABELS[option]}
            </Link>
          ))}
        </div>
      </section>

      {/* Industry */}
      <section className="mb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Industry</span>
          <Link href={buildHref({ category: undefined })} aria-current={!categoryFilter ? "true" : undefined} className={filterChipClass(!categoryFilter)}>
            All industries
          </Link>
          {INDUSTRY_OPTIONS.map((category) => (
            <Link key={category} href={buildHref({ category })} aria-current={categoryFilter === category ? "true" : undefined} className={filterChipClass(categoryFilter === category)}>
              {category}
            </Link>
          ))}
        </div>
      </section>

      {/* Rating */}
      <section className="mb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Rating</span>
          <Link href={buildHref({ rating: undefined })} aria-current={minRating === null ? "true" : undefined} className={filterChipClass(minRating === null)}>All ratings</Link>
          {RATING_OPTIONS.map(({ value, label }) => (
            <Link key={value} href={buildHref({ rating: value })} aria-current={minRating === Number(value) ? "true" : undefined} className={filterChipClass(minRating === Number(value))}>
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Status */}
      <section className="mb-6">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Status</span>
          <Link href={buildHref({ status: undefined })} aria-current={!statusFilter ? "true" : undefined} className={filterChipClass(!statusFilter)}>All</Link>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <Link key={value} href={buildHref({ status: value })} aria-current={statusFilter === value ? "true" : undefined} className={filterChipClass(statusFilter === value)}>
              {label}
            </Link>
          ))}
        </div>
      </section>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-8 text-center">
          <p className="font-medium">No businesses match your filters.</p>
          <p className="mt-1 text-sm text-muted">Try expanding your distance or adjusting the filters above.</p>
          {(minRating !== null || statusFilter || categoryFilter) && (
            <Link href={buildHref({ rating: undefined, status: undefined, category: undefined })} className="mt-3 inline-block text-sm text-accent hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {businesses.map((business) => (
            <BusinessListingCard
              key={business.id}
              business={business}
              latestPosts={latestPosts.get(business.id) ?? []}
              currentUserId={userId}
              hasEvents={businessIdsWithEvents.has(business.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
