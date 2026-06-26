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
import { INDUSTRY_OPTIONS, isIndustryOption } from "@/lib/industries";

const RATING_OPTIONS = [
  { value: "4", label: "4★ & up" },
  { value: "3", label: "3★ & up" },
  { value: "2", label: "2★ & up" },
];

const STATUS_OPTIONS = [
  { value: "hiring", label: "Hiring" },
  { value: "deals", label: "Has deals" },
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
  }>;
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
  const statusFilter =
    params.status === "hiring" || params.status === "deals" ? params.status : null;

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

  const allBusinesses = await getBusinesses({
    query: query || undefined,
    category: categoryFilter,
    discoveryRadius: discoveryFilter,
    viewer,
  });

  const latestPosts = await getLatestPostsForBusinessIds(allBusinesses.map((b) => b.id));

  // Apply rating + status filters after fetching (uses already-loaded data)
  const businesses = allBusinesses.filter((b) => {
    if (minRating !== null) {
      if (b.ratingCount === 0 || b.ratingAvg < minRating) return false;
    }
    if (statusFilter === "hiring") {
      const posts = latestPosts.get(b.id) ?? [];
      const hasJobPost = posts.some((p) => p.postType === "job");
      if (!b.intents.includes("hiring") && !hasJobPost) return false;
    }
    if (statusFilter === "deals") {
      const posts = latestPosts.get(b.id) ?? [];
      if (!posts.some((p) => p.postType === "deal")) return false;
    }
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

      {/* Near */}
      <section className="mb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Near</span>
          {DISCOVERY_FILTER_OPTIONS.map((option) => (
            <Link key={option} href={buildHref({ near: discoveryFilterHrefValue(option) })}
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
          <Link href={buildHref({ category: undefined })} className={filterChipClass(!categoryFilter)}>
            All industries
          </Link>
          {INDUSTRY_OPTIONS.map((category) => (
            <Link key={category} href={buildHref({ category })} className={filterChipClass(categoryFilter === category)}>
              {category}
            </Link>
          ))}
        </div>
      </section>

      {/* Rating + Status on one row */}
      <section className="mb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Rating</span>
          <Link href={buildHref({ rating: undefined })} className={filterChipClass(minRating === null)}>
            All ratings
          </Link>
          {RATING_OPTIONS.map(({ value, label }) => (
            <Link key={value} href={buildHref({ rating: value })} className={filterChipClass(minRating === Number(value))}>
              {label}
            </Link>
          ))}
          <span className="mx-2 text-border">|</span>
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Status</span>
          <Link href={buildHref({ status: undefined })} className={filterChipClass(!statusFilter)}>
            All
          </Link>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <Link key={value} href={buildHref({ status: value })} className={filterChipClass(statusFilter === value)}>
              {label}
            </Link>
          ))}
        </div>
      </section>

      <form action="/listings" method="get" className="mb-8 flex flex-col gap-3 sm:flex-row">
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

      {businesses.length === 0 ? (
        <p className="text-muted">
          No businesses match your filters. Try expanding your distance or adjusting the filters above.
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
