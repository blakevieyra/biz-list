import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import { PageHeader } from "@/components/ui";
import { getBusinesses, getCurrentProfile } from "@/lib/data";
import {
  DEFAULT_DISCOVERY_RADIUS,
  FEED_SCOPE_LABELS,
  resolveDiscoveryRadius,
} from "@/lib/feed/location-scope";
import type { BusinessIntent, DiscoveryRadius } from "@/lib/types";
import { INTENT_LABELS } from "@/lib/types";

const intents: BusinessIntent[] = [
  "hiring",
  "seeking_customers",
  "seeking_advice",
  "open_to_partnerships",
];

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; q?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const intentFilter = params.intent as BusinessIntent | undefined;
  const query = params.q ?? "";
  const scope = resolveDiscoveryRadius(
    params.scope,
    profile?.discoveryRadius ?? profile?.feedScope,
  );

  const viewer = profile
    ? {
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        latitude: profile.latitude,
        longitude: profile.longitude,
        industryInterests: profile.industryInterests,
      }
    : null;

  const businesses = await getBusinesses({
    intent: intentFilter,
    query: query || undefined,
    scope,
    viewer,
  });

  function buildHref(next: Record<string, string | undefined>) {
    const merged = {
      q: query || undefined,
      intent: intentFilter,
      scope: scope !== DEFAULT_DISCOVERY_RADIUS ? scope : undefined,
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
        description="Browse local businesses near you. Results are ranked by your location, industry interests, and reviews — expand your radius when you need more options."
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
          with your business location to personalize listings near you.
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(FEED_SCOPE_LABELS) as DiscoveryRadius[]).map((s) => (
          <Link
            key={s}
            href={buildHref({ scope: s === DEFAULT_DISCOVERY_RADIUS ? undefined : s })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              scope === s
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {FEED_SCOPE_LABELS[s]}
          </Link>
        ))}
      </div>

      <form className="mb-8 flex flex-col gap-4 sm:flex-row">
        {intentFilter && <input type="hidden" name="intent" value={intentFilter} />}
        {scope !== DEFAULT_DISCOVERY_RADIUS && <input type="hidden" name="scope" value={scope} />}
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by name, industry, city, or zip..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href={buildHref({ intent: undefined })}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            !intentFilter
              ? "bg-accent text-white"
              : "border border-border bg-card text-muted hover:text-foreground"
          }`}
        >
          All
        </Link>
        {intents.map((intent) => (
          <Link
            key={intent}
            href={buildHref({ intent })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              intentFilter === intent
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {INTENT_LABELS[intent]}
          </Link>
        ))}
      </div>

      {businesses.length === 0 ? (
        <p className="text-muted">
          No businesses found{scope !== "nationwide" ? " in this area" : ""}. Try expanding your search radius.
        </p>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}
