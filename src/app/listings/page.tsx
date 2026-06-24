import Link from "next/link";
import { BusinessListingCard } from "@/components/business-listing-card";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinesses, getCurrentProfile } from "@/lib/data";
import { getLatestPostsForBusinessIds } from "@/lib/data/business";
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
import { SERVICE_TYPE_OPTIONS, isServiceType } from "@/lib/service-types";

const SEARCH_TYPES = [
  { value: "all", label: "All" },
  { value: "products", label: "Products & services" },
] as const;

type SearchType = (typeof SEARCH_TYPES)[number]["value"];

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    subcategory?: string;
    q?: string;
    scope?: string;
    miles?: string;
    searchType?: string;
    productType?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const userId = await getAuthUserId();
  const categoryFilter = isIndustryOption(params.category ?? "") ? params.category : undefined;
  const subcategoryFilter =
    categoryFilter &&
    params.subcategory &&
    isValidSubcategory(categoryFilter, params.subcategory)
      ? params.subcategory
      : undefined;
  const query = params.q ?? "";
  const searchType: SearchType = params.searchType === "products" ? "products" : "all";
  const productType =
    params.productType && isServiceType(params.productType) ? params.productType : undefined;
  const areaScope = resolveAreaScope(params.scope, profile?.discoveryRadius ?? profile?.feedScope);
  const mileRadius = resolveMileRadius(params.miles) ?? DEFAULT_MILE_RADIUS;

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

  const businesses = await getBusinesses({
    category: categoryFilter,
    subcategory: subcategoryFilter,
    query: query || undefined,
    searchType,
    productType,
    areaScope,
    mileRadius,
    viewer,
  });

  const latestPosts = await getLatestPostsForBusinessIds(businesses.map((b) => b.id));

  function buildHref(next: Record<string, string | undefined>) {
    const merged = {
      q: query || undefined,
      category: categoryFilter,
      subcategory: subcategoryFilter,
      scope: areaScope !== DEFAULT_DISCOVERY_RADIUS ? areaScope : undefined,
      miles: mileRadius !== DEFAULT_MILE_RADIUS ? mileRadius : undefined,
      searchType: searchType !== "all" ? searchType : undefined,
      productType,
      ...next,
    };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `/listings?${qs}` : "/listings";
  }

  const subcategories = categoryFilter ? getSubcategories(categoryFilter) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Listings"
        description="Browse local businesses ranked nearest and most relevant to you. Filter by area, industry, and business type."
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
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Link href="/auth/signup" className="font-medium underline">
            Create a profile
          </Link>{" "}
          with your interests to personalize listings near you.
        </p>
      )}

      <section className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Distance from you
        </p>
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

      <section className="mb-6">
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
      </section>

      {categoryFilter && subcategories.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Business type · {categoryFilter}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ subcategory: undefined })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                !subcategoryFilter
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              All types
            </Link>
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
        </section>
      )}

      {searchType === "products" && (
        <section className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Product type
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ productType: undefined })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                !productType
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              All types
            </Link>
            {SERVICE_TYPE_OPTIONS.map((type) => (
              <Link
                key={type}
                href={buildHref({ productType: type })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  productType === type
                    ? "bg-accent text-white"
                    : "border border-border bg-card text-muted hover:text-foreground"
                }`}
              >
                {type}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Search by</p>
        <div className="flex flex-wrap gap-2">
          {SEARCH_TYPES.map(({ value, label }) => (
            <Link
              key={value}
              href={buildHref({ searchType: value === "all" ? undefined : value })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                searchType === value
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <form className="mb-8 flex flex-col gap-4 sm:flex-row">
        {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
        {subcategoryFilter && <input type="hidden" name="subcategory" value={subcategoryFilter} />}
        {areaScope !== DEFAULT_DISCOVERY_RADIUS && (
          <input type="hidden" name="scope" value={areaScope} />
        )}
        {mileRadius !== DEFAULT_MILE_RADIUS && (
          <input type="hidden" name="miles" value={mileRadius} />
        )}
        {searchType !== "all" && <input type="hidden" name="searchType" value={searchType} />}
        {productType && <input type="hidden" name="productType" value={productType} />}
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder={
            searchType === "products"
              ? "Search products and services..."
              : "Search by name, type, city, or zip..."
          }
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
