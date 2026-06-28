import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ACTIVITY_TAB_POST_TYPES,
  ACTIVITY_TABS,
  ActivityFeedPanel,
  type ActivityTab,
} from "@/components/activity-feed-panel";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/data";
import { getFeedBusinessPosts } from "@/lib/data/business";
import { resolveActiveDiscoveryFilter } from "@/lib/feed/location-scope";

export default async function HomeHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    scope?: string;
    miles?: string;
    q?: string;
  }>;
}) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const params = await searchParams;
  const activityTab: ActivityTab = ACTIVITY_TABS.some((t) => t.id === params.tab)
    ? (params.tab as ActivityTab)
    : "all";
  const discoveryRadius = resolveActiveDiscoveryFilter({
    miles: params.miles,
    scope: params.scope,
    profileDefault: profile.discoveryRadius,
  });
  const query = params.q ?? "";

  const viewer = {
    city: profile.city,
    state: profile.state,
    county: profile.county,
    zipCode: profile.zipCode,
    country: profile.country,
    latitude: profile.latitude,
    longitude: profile.longitude,
    industryInterests: profile.industryInterests,
  };

  const isBusinessAccount = profile.role === "business" || profile.role === "organization" || profile.role === "marketer";

  const businessPosts = await getFeedBusinessPosts({
    viewer,
    discoveryRadius,
    userId,
    postTypes: ACTIVITY_TAB_POST_TYPES[activityTab],
    limit: 30,
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
        title={`Welcome back, ${profile.displayName}`}
        description="Updates, deals, jobs, and events from businesses near you."
        action={
          isBusinessAccount ? (
            <Link
              href="/dashboard/posts"
              className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-accent"
            >
              Create post
            </Link>
          ) : undefined
        }
      />

      <ActivityFeedPanel
        basePath="/home"
        tab={activityTab}
        discoveryRadius={discoveryRadius}
        milesParam={params.miles}
        scopeParam={params.scope}
        query={query}
        posts={posts}
        currentUserId={userId}
      />
    </div>
  );
}
