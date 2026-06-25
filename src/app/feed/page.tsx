import Link from "next/link";
import { ForumPostCard } from "@/components/forum-post-card";
import { FeedPostCard } from "@/components/feed-post-card";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile, getForumPosts } from "@/lib/data";
import { getFeedBusinessPosts } from "@/lib/data/business";
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
import type { BusinessPostType, ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

const tabs = [
  { id: "all", label: "All" },
  { id: "updates", label: "Updates" },
  { id: "jobs", label: "Jobs" },
  { id: "sales", label: "Sales & deals" },
  { id: "help", label: "Help needed" },
  { id: "free", label: "Free" },
  { id: "discussions", label: "Discussions" },
] as const;

type FeedTab = (typeof tabs)[number]["id"];

const forumCategories = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

const tabPostTypes: Partial<Record<FeedTab, BusinessPostType[]>> = {
  updates: ["update", "video"],
  jobs: ["job"],
  sales: ["deal"],
  help: ["help_needed"],
  free: ["free"],
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    scope?: string;
    miles?: string;
    q?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const userId = await getAuthUserId();
  const tab: FeedTab = tabs.some((t) => t.id === params.tab)
    ? (params.tab as FeedTab)
    : "all";
  const areaScope = resolveAreaScope(params.scope, profile?.discoveryRadius ?? profile?.feedScope);
  const mileRadius = resolveMileRadius(params.miles) ?? DEFAULT_MILE_RADIUS;
  const query = params.q ?? "";
  const categoryFilter = params.category as ForumCategory | undefined;
  const isBusinessAccount = profile?.role === "business" || profile?.role === "organization";

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

  const [businessPosts, forumPosts] = await Promise.all([
    tab === "discussions"
      ? Promise.resolve([])
      : getFeedBusinessPosts({
          viewer,
          areaScope,
          mileRadius,
          userId,
          postTypes: tabPostTypes[tab],
          limit: 30,
        }),
    getForumPosts(tab === "discussions" ? categoryFilter : undefined),
  ]);

  function filterByQuery<T extends { title: string; body: string }>(
    items: T[],
    extra?: (item: T) => string,
  ) {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        (extra?.(item).toLowerCase().includes(q) ?? false),
    );
  }

  const posts = filterByQuery(businessPosts, (p) => p.businessName ?? "");
  const discussionPosts = filterByQuery(forumPosts, (p) => p.authorName);

  function buildHref(next: Record<string, string | undefined>) {
    const merged = {
      tab: tab !== "all" ? tab : undefined,
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
    return qs ? `/feed?${qs}` : "/feed";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Posts"
        description="Latest updates from businesses you follow, plus trending, top-rated, and popular listings near you."
        action={
          isBusinessAccount ? (
            <Link
              href="/dashboard/posts"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Create post
            </Link>
          ) : (
            <Link
              href="/listings"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Browse listings
            </Link>
          )
        }
      />

      {!profile && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Link href="/auth/signup" className="font-medium underline">
            Create a profile
          </Link>{" "}
          to follow businesses and personalize your local feed.
        </p>
      )}

      <div className="filter-scroll mb-4">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={buildHref({ tab: t.id === "all" ? undefined : t.id, category: undefined })}
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

      <div className="filter-scroll mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted sm:leading-8">
          Distance
        </span>
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

      <div className="filter-scroll mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted sm:leading-8">
          Area
        </span>
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

      {tab === "discussions" && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href={buildHref({ category: undefined })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              !categoryFilter
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            All topics
          </Link>
          {forumCategories.map((category) => (
            <Link
              key={category}
              href={buildHref({ category })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                categoryFilter === category
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {FORUM_CATEGORY_LABELS[category]}
            </Link>
          ))}
        </div>
      )}

      <form className="mb-6 flex flex-col gap-3 sm:flex-row">
        {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
        {areaScope !== DEFAULT_DISCOVERY_RADIUS && (
          <input type="hidden" name="scope" value={areaScope} />
        )}
        {mileRadius !== DEFAULT_MILE_RADIUS && (
          <input type="hidden" name="miles" value={mileRadius} />
        )}
        {categoryFilter && tab === "discussions" && (
          <input type="hidden" name="category" value={categoryFilter} />
        )}
        <input
          name="q"
          defaultValue={query}
          placeholder="Search latest business posts..."
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
        {tab !== "discussions" &&
          (posts.length ? (
            posts.map((post) => (
              <FeedPostCard key={post.id} post={post} currentUserId={userId} />
            ))
          ) : (
            <p className="text-center text-muted">
              No business posts in this area yet. Only businesses can publish posts to listings.
            </p>
          ))}

        {tab === "discussions" &&
          (discussionPosts.length ? (
            discussionPosts.map((post) => <ForumPostCard key={post.id} post={post} />)
          ) : (
            <p className="text-center text-muted">No discussions in this topic yet.</p>
          ))}
      </div>
    </div>
  );
}
