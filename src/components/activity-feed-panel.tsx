import Link from "next/link";
import { FeedPostCard } from "@/components/feed-post-card";
import {
  AREA_SCOPE_LABELS,
  AREA_SCOPE_OPTIONS,
  DEFAULT_MILE_RADIUS,
  isAreaFilterActive,
  isMileFilterActive,
  MILE_RADIUS_LABELS,
  MILE_RADIUS_OPTIONS,
  resolveMileRadius,
} from "@/lib/feed/location-scope";
import type {
  AreaScope,
  BusinessPost,
  BusinessPostType,
  DiscoveryRadius,
  MileRadius,
} from "@/lib/types";

export const ACTIVITY_TABS = [
  { id: "all", label: "All" },
  { id: "updates", label: "Updates" },
  { id: "discussions", label: "Discussions" },
  { id: "jobs", label: "Jobs" },
  { id: "sales", label: "Sales & deals" },
  { id: "help", label: "Help needed" },
  { id: "free", label: "Free" },
] as const;

export type ActivityTab = (typeof ACTIVITY_TABS)[number]["id"];

export const ACTIVITY_TAB_POST_TYPES: Partial<Record<ActivityTab, BusinessPostType[]>> = {
  updates: ["update", "video"],
  discussions: ["discussion"],
  jobs: ["job"],
  sales: ["deal"],
  help: ["help_needed"],
  free: ["free"],
};

export function ActivityFeedPanel({
  basePath,
  tab,
  discoveryRadius,
  milesParam,
  scopeParam,
  query,
  posts,
  currentUserId,
  showProfilePrompt = false,
}: {
  basePath: string;
  tab: ActivityTab;
  discoveryRadius: DiscoveryRadius;
  milesParam?: string;
  scopeParam?: string;
  query: string;
  posts: BusinessPost[];
  currentUserId: string | null;
  showProfilePrompt?: boolean;
}) {
  const mileMode = isMileFilterActive(milesParam, scopeParam);
  const areaMode = isAreaFilterActive(milesParam, scopeParam);

  function buildHref(next: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = {
      view: "activity",
      tab: tab !== "all" ? tab : undefined,
      q: query || undefined,
      miles: milesParam,
      scope: scopeParam,
      ...next,
    };

    if (next.miles === "") merged.miles = undefined;
    if (next.scope === "") merged.scope = undefined;

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  function mileIsActive(m: MileRadius): boolean {
    if (mileMode) return milesParam === m;
    if (!areaMode && !milesParam && !scopeParam) return discoveryRadius === m;
    return false;
  }

  function areaIsActive(s: AreaScope): boolean {
    if (areaMode) return scopeParam === s;
    if (!mileMode && !milesParam && !scopeParam) return discoveryRadius === s;
    return false;
  }

  return (
    <>
      {showProfilePrompt && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Link href="/auth/signup" className="font-medium underline">
            Create a profile
          </Link>{" "}
          to follow businesses and personalize your local feed.
        </p>
      )}

      <div className="filter-scroll mb-4">
        {ACTIVITY_TABS.map((t) => (
          <Link
            key={t.id}
            href={buildHref({ tab: t.id === "all" ? undefined : t.id })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              tab === t.id
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="filter-scroll mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted sm:leading-8">
          Distance
        </span>
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
        <span className="mx-1 text-border">|</span>
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

      <form action="/home" method="get" className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input type="hidden" name="view" value="activity" />
        {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
        {scopeParam && <input type="hidden" name="scope" value={scopeParam} />}
        {milesParam && <input type="hidden" name="miles" value={milesParam} />}
        <input
          name="q"
          defaultValue={query}
          placeholder="Search business posts..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      <div className="space-y-4">
        {posts.length ? (
          posts.map((post) => (
            <FeedPostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))
        ) : (
          <p className="text-center text-muted">
            No business posts in this area yet. Try widening your distance or area filters.
          </p>
        )}
      </div>
    </>
  );
}
