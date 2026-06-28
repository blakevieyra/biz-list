import Link from "next/link";
import { CollaborationGridCard } from "@/components/collaboration-grid-card";
import { getAuthUserId } from "@/lib/actions/auth";
import { Card, PageHeader } from "@/components/ui";
import { getCollaborations, getCurrentProfile } from "@/lib/data";
import { INDUSTRY_OPTIONS, isIndustryOption } from "@/lib/industries";
import {
  DISCOVERY_FILTER_OPTIONS,
  DISCOVERY_RADIUS_LABELS,
  discoveryFilterHrefValue,
  resolveActiveDiscoveryFilter,
} from "@/lib/feed/location-scope";
import type { CollaborationType } from "@/lib/types";

const collaborationTabs: { id: CollaborationType; label: string }[] = [
  { id: "proposal", label: "Proposals" },
  { id: "contract", label: "Contracts" },
  { id: "b2b_sale", label: "B2B Sales" },
];

const chipClass = (active: boolean, large = false) =>
  `rounded-full font-medium leading-none ${
    large ? "px-5 py-2 text-sm" : "px-2.5 py-1 text-[11px]"
  } ${
    active
      ? "bg-accent text-white"
      : "border border-border bg-card text-muted hover:text-foreground"
  }`;

export default async function CollaboratePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; near?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const tab: CollaborationType = collaborationTabs.some((t) => t.id === params.tab)
    ? (params.tab as CollaborationType)
    : "proposal";
  const userId = await getAuthUserId();
  const profile = await getCurrentProfile();
  const isBusinessAccount =
    profile?.role === "business" || profile?.role === "organization" || profile?.role === "marketer";

  const discoveryFilter = resolveActiveDiscoveryFilter({
    miles: undefined,
    scope: params.near,
    profileDefault: profile?.discoveryRadius,
  });
  const categoryFilter = isIndustryOption(params.category ?? "") ? params.category : undefined;
  const query = params.q?.trim() ?? "";

  const collaborations = await getCollaborations(tab, userId);

  // Client-side filter by category and search query
  let filtered = collaborations;
  if (categoryFilter) {
    filtered = filtered.filter((c) => c.businessCategory === categoryFilter);
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary?.toLowerCase().includes(q) ||
        (c.businessName ?? "").toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q),
    );
  }

  const sorted = [...filtered].sort(
    (a, b) => (b.interestedCount ?? 0) - (a.interestedCount ?? 0),
  );

  function buildHref(overrides: Record<string, string | undefined>) {
    const base: Record<string, string | undefined> = {
      tab: tab === "proposal" ? undefined : tab,
      near: discoveryFilterHrefValue(discoveryFilter) || undefined,
      category: categoryFilter,
      q: query || undefined,
    };
    const merged = { ...base, ...overrides };
    const qs = Object.entries(merged)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    return `/partnerships${qs ? `?${qs}` : ""}`;
  }

  function tabHref(next: CollaborationType) {
    const qs = new URLSearchParams();
    if (next !== "proposal") qs.set("tab", next);
    if (discoveryFilterHrefValue(discoveryFilter)) qs.set("near", discoveryFilterHrefValue(discoveryFilter)!);
    if (categoryFilter) qs.set("category", categoryFilter);
    if (query) qs.set("q", query);
    const s = qs.toString();
    return `/partnerships${s ? `?${s}` : ""}`;
  }

  const createLabel =
    tab === "contract" ? "Create contract" :
    tab === "b2b_sale" ? "Create B2B sale" :
    "Create proposal";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Collaborations"
        description={
          tab === "b2b_sale"
            ? "B2B sales from local businesses."
            : tab === "contract"
            ? "Contract opportunities from local businesses."
            : "Partnership proposals from local businesses."
        }
        action={
          isBusinessAccount ? (
            <Link
              href={`/partnerships/new?type=${tab}`}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              {createLabel}
            </Link>
          ) : (
            <Link
              href="/profile/create"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Business account required
            </Link>
          )
        }
      />

      {/* Search bar — above all filters */}
      <form action="/partnerships" method="get" className="mb-4 flex flex-col gap-3 sm:flex-row">
        {tab !== "proposal" && <input type="hidden" name="tab" value={tab} />}
        {discoveryFilterHrefValue(discoveryFilter) && (
          <input type="hidden" name="near" value={discoveryFilterHrefValue(discoveryFilter)!} />
        )}
        {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by title, business, or location…"
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      {/* Type tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {collaborationTabs.map(({ id, label }) => (
          <Link key={id} href={tabHref(id)} className={chipClass(tab === id, true)}>
            {label}
          </Link>
        ))}
      </div>

      {/* Near filter */}
      <section className="mb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Near</span>
          {DISCOVERY_FILTER_OPTIONS.map((option) => (
            <Link key={option} href={buildHref({ near: discoveryFilterHrefValue(option) || undefined })}
              className={chipClass(discoveryFilter === option)}>
              {DISCOVERY_RADIUS_LABELS[option]}
            </Link>
          ))}
        </div>
      </section>

      {/* Industry filter */}
      <section className="mb-6">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Industry</span>
          <Link href={buildHref({ category: undefined })} className={chipClass(!categoryFilter)}>
            All industries
          </Link>
          {INDUSTRY_OPTIONS.map((cat) => (
            <Link key={cat} href={buildHref({ category: cat })} className={chipClass(categoryFilter === cat)}>
              {cat}
            </Link>
          ))}
        </div>
      </section>

      {/* Single-column full-width results */}
      {sorted.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No {collaborationTabs.find((t) => t.id === tab)?.label.toLowerCase()} yet.{" "}
            {isBusinessAccount && (
              <Link href={`/partnerships/new?type=${tab}`} className="text-accent hover:underline">
                Create the first one
              </Link>
            )}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((idea) => (
            <CollaborationGridCard key={idea.id} idea={idea} currentUserId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
