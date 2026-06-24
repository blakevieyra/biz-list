import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import { ForumPostCard } from "@/components/forum-post-card";
import { PageHeader, Card, formatDate } from "@/components/ui";
import {
  getCommunityBusinesses,
  getCurrentProfile,
  getForumPosts,
} from "@/lib/data";
import { getTrendingBusinessPosts } from "@/lib/data/business";
import {
  DEFAULT_DISCOVERY_RADIUS,
  DISCOVERY_RADIUS_LABELS,
  resolveDiscoveryRadius,
} from "@/lib/feed/location-scope";
import { PostMediaGallery, PostTypeBadge } from "@/components/post-media";
import { isImageUrl } from "@/lib/media/post-media";
import type { BusinessPost, DiscoveryRadius, ForumCategory } from "@/lib/types";

import { FORUM_CATEGORY_LABELS } from "@/lib/types";

const tabs = [
  { id: "all", label: "All" },
  { id: "updates", label: "Updates" },
  { id: "jobs", label: "Jobs" },
  { id: "sales", label: "Sales & deals" },
  { id: "discussions", label: "Discussions" },
] as const;

type FeedTab = (typeof tabs)[number]["id"];

const forumCategories = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

function FeedBusinessPost({ post }: { post: BusinessPost }) {
  const hero = post.mediaUrls.find(isImageUrl);

  return (
    <Card className="overflow-hidden p-0">
      {hero && (
        <div className="h-40 overflow-hidden border-b border-border bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1">
              <PostTypeBadge type={post.postType} />
            </div>
            <Link
              href={`/listings/${post.businessId}`}
              className="text-sm font-semibold text-accent hover:underline"
            >
              {post.businessName ?? "Local business"}
            </Link>
            {post.businessCategory && (
              <p className="text-xs text-muted">{post.businessCategory}</p>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted">{formatDate(post.createdAt)}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold">{post.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{post.body}</p>
        {post.mediaUrls.length > 0 && (
          <div className="mt-4">
            <PostMediaGallery urls={post.mediaUrls} />
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link href={`/listings/${post.businessId}`} className="font-medium text-accent hover:underline">
            View business →
          </Link>
          {post.isTrending && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Trending
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    scope?: string;
    q?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const tab: FeedTab = tabs.some((t) => t.id === params.tab)
    ? (params.tab as FeedTab)
    : "all";
  const radius = resolveDiscoveryRadius(
    params.scope,
    profile?.discoveryRadius ?? profile?.feedScope,
  );
  const query = params.q ?? "";
  const categoryFilter = params.category as ForumCategory | undefined;

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

  const [businessPosts, forumPosts, hiringBusinesses] = await Promise.all([
    getTrendingBusinessPosts(24),
    getForumPosts(tab === "discussions" ? categoryFilter : undefined),
    tab === "jobs" || tab === "all"
      ? getCommunityBusinesses({ scope: radius, viewer, hiringOnly: true, query: query || undefined })
      : Promise.resolve([]),
  ]);

  let updates = businessPosts;
  if (query) {
    const q = query.toLowerCase();
    updates = updates.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.businessName?.toLowerCase().includes(q) ?? false),
    );
  }

  const updatePosts = updates.filter((p) => p.postType === "update" || p.postType === "video");
  const jobPosts = updates.filter((p) => p.postType === "job");
  const salesPosts = updates.filter((p) => p.postType === "deal");
  const discussionPosts = forumPosts.filter((post) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      post.title.toLowerCase().includes(q) ||
      post.body.toLowerCase().includes(q) ||
      post.authorName.toLowerCase().includes(q)
    );
  });

  function buildHref(next: Record<string, string | undefined>) {
    const merged = {
      tab: tab !== "all" ? tab : undefined,
      scope: radius !== DEFAULT_DISCOVERY_RADIUS ? radius : undefined,
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
        title="Feed"
        description="Updates, jobs, sales, and discussions from businesses near you. Expand your radius to see more."
        action={
          <Link
            href="/forum/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            New post
          </Link>
        }
      />

      {!profile && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Link href="/auth/signup" className="font-medium underline">
            Create a profile
          </Link>{" "}
          with your business location to personalize your local feed.
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={buildHref({ tab: t.id === "all" ? undefined : t.id, category: undefined })}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(DISCOVERY_RADIUS_LABELS) as DiscoveryRadius[]).map((r) => (
          <Link
            key={r}
            href={buildHref({ scope: r === DEFAULT_DISCOVERY_RADIUS ? undefined : r })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              radius === r
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {DISCOVERY_RADIUS_LABELS[r]}
          </Link>
        ))}
      </div>

      {tab === "discussions" && (
        <div className="mb-6 flex flex-wrap gap-2">
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

      <form className="mb-8 flex flex-col gap-4 sm:flex-row">
        {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
        {radius !== DEFAULT_DISCOVERY_RADIUS && <input type="hidden" name="scope" value={radius} />}
        {categoryFilter && tab === "discussions" && (
          <input type="hidden" name="category" value={categoryFilter} />
        )}
        <input
          name="q"
          defaultValue={query}
          placeholder="Search updates, jobs, deals, and discussions..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      <div className="mx-auto max-w-2xl space-y-6">
        {tab === "all" && (
          <>
            {updates.slice(0, 6).map((post) => (
              <FeedBusinessPost key={`post-${post.id}`} post={post} />
            ))}
            {discussionPosts.slice(0, 4).map((post) => (
              <ForumPostCard key={`forum-${post.id}`} post={post} />
            ))}
            {hiringBusinesses.slice(0, 3).map((business) => (
              <BusinessCard key={`job-${business.id}`} business={business} />
            ))}
            {!updates.length && !discussionPosts.length && !hiringBusinesses.length && (
              <p className="text-center text-muted">Nothing in your feed yet. Try expanding your radius.</p>
            )}
          </>
        )}

        {tab === "updates" &&
          (updatePosts.length ? (
            updatePosts.map((post) => <FeedBusinessPost key={post.id} post={post} />)
          ) : (
            <p className="text-center text-muted">No business updates in this area yet.</p>
          ))}

        {tab === "jobs" &&
          (jobPosts.length || hiringBusinesses.length ? (
            <>
              {jobPosts.map((post) => (
                <FeedBusinessPost key={`post-${post.id}`} post={post} />
              ))}
              {hiringBusinesses.map((business) => (
                <BusinessCard key={`biz-${business.id}`} business={business} />
              ))}
            </>
          ) : (
            <p className="text-center text-muted">No open jobs in this area right now.</p>
          ))}

        {tab === "sales" &&
          (salesPosts.length ? (
            salesPosts.map((post) => <FeedBusinessPost key={post.id} post={post} />)
          ) : (
            <p className="text-center text-muted">No sales or deals posted nearby yet.</p>
          ))}

        {tab === "discussions" &&
          (discussionPosts.length ? (
            discussionPosts.map((post) => <ForumPostCard key={post.id} post={post} />)
          ) : (
            <p className="text-center text-muted">No discussions yet. Start one with New post.</p>
          ))}
      </div>
    </div>
  );
}
