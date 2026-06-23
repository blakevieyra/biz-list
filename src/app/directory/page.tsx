import { BusinessCard } from "@/components/business-card";
import { PageHeader } from "@/components/ui";
import { getBusinesses } from "@/lib/data";
import type { BusinessIntent } from "@/lib/types";
import { INTENT_LABELS } from "@/lib/types";
import Link from "next/link";

const intents: BusinessIntent[] = [
  "hiring",
  "seeking_customers",
  "seeking_advice",
  "open_to_partnerships",
];

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; q?: string }>;
}) {
  const params = await searchParams;
  const intentFilter = params.intent as BusinessIntent | undefined;
  const query = params.q ?? "";

  const businesses = await getBusinesses({
    intent: intentFilter,
    query: query || undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Business Directory"
        description="Find local businesses and organizations that are hiring, seeking customers, looking for advice, or open to partnerships."
      />

      <form className="mb-8 flex flex-col gap-4 sm:flex-row">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by name, category, or city..."
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
          href="/directory"
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
            href={`/directory?intent=${intent}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
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
        <p className="text-muted">No businesses match your search.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}
