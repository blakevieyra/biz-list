import Link from "next/link";
import {
  ACTIVITY_TAB_POST_TYPES,
  ACTIVITY_TABS,
  ActivityFeedPanel,
  type ActivityTab,
} from "@/components/activity-feed-panel";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getFeedBusinessPosts } from "@/lib/data/business";
import { DEFAULT_DISCOVERY_RADIUS } from "@/lib/feed/location-scope";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    miles?: string;
    scope?: string;
    q?: string;
  }>;
}) {
  const [userId, params] = await Promise.all([getAuthUserId(), searchParams]);

  const tab: ActivityTab = ACTIVITY_TABS.some((t) => t.id === params.tab)
    ? (params.tab as ActivityTab)
    : "all";
  const query = params.q ?? "";

  const businessPosts = await getFeedBusinessPosts({
    viewer: null,
    userId,
    postTypes: ACTIVITY_TAB_POST_TYPES[tab],
    limit: 40,
  });

  const posts = query
    ? businessPosts.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          (p.businessName ?? "").toLowerCase().includes(q)
        );
      })
    : businessPosts;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Local Business Feed"
        description="Updates, jobs, deals, and more from businesses on BizList."
        action={
          !userId ? (
            <Link
              href="/auth/signup"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Create profile
            </Link>
          ) : undefined
        }
      />

      <ActivityFeedPanel
        basePath="/feed"
        tab={tab}
        discoveryRadius={DEFAULT_DISCOVERY_RADIUS}
        milesParam={params.miles}
        scopeParam={params.scope}
        query={query}
        posts={posts}
        currentUserId={userId}
        showProfilePrompt={!userId}
      />
    </div>
  );
}
