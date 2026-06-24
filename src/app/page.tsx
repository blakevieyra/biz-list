import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import { BusinessPostFeed } from "@/components/business-post-feed";
import { CollaborationCard } from "@/components/collaboration-card";
import { ForumPostCard } from "@/components/forum-post-card";
import {
  getBusinesses,
  getCollaborations,
  getCurrentProfile,
  getForumPosts,
} from "@/lib/data";
import { getTrendingBusinessPosts } from "@/lib/data/business";
import { DEFAULT_DISCOVERY_RADIUS } from "@/lib/feed/location-scope";

const features = [
  {
    title: "Listings",
    description:
      "Browse local businesses by location and industry. Expand your radius when you need more options.",
    href: "/listings",
  },
  {
    title: "Feed",
    description:
      "Follow business updates, open jobs, sales, deals, and community discussions in one scrollable feed.",
    href: "/feed",
  },
  {
    title: "Partnerships",
    description:
      "Create B2B deals, joint ventures, work groups, sales events, and organized partnership opportunities.",
    href: "/partnerships",
  },
];

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const viewer = profile
    ? {
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        industryInterests: profile.industryInterests,
      }
    : null;
  const scope = profile?.discoveryRadius ?? profile?.feedScope ?? DEFAULT_DISCOVERY_RADIUS;

  const [businesses, posts, collaborations, trendingPosts] = await Promise.all([
    getBusinesses({ scope, viewer }),
    getForumPosts(),
    getCollaborations(),
    getTrendingBusinessPosts(4),
  ]);

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-blue-50 to-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              bizlist.app
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Listings. Feed. Partnerships.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
              BizList helps local businesses get discovered, share updates and deals, hire talent,
              and build B2B partnerships — all from your business location outward.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/auth/signup"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-accent-hover"
              >
                Create your profile
              </Link>
              <Link
                href="/feed"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition hover:border-accent/40"
              >
                Explore feed
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold">What you can do on BizList</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="rounded-2xl border border-border bg-card p-6 transition hover:border-accent/40 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {trendingPosts.length > 0 && (
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <BusinessPostFeed posts={trendingPosts} />
          </div>
        </section>
      )}

      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Featured businesses</h2>
              <p className="mt-2 text-muted">
                {viewer
                  ? `Near your zip code and matching your interests in your ${scope} area.`
                  : "Organizations hiring, seeking customers, or open to partnerships."}
              </p>
            </div>
            <Link href="/listings" className="text-sm font-medium text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-8 grid auto-rows-fr gap-6 md:grid-cols-3">
            {businesses.slice(0, 3).map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-bold">Latest from the feed</h2>
              <Link href="/feed?tab=discussions" className="text-sm font-medium text-accent hover:underline">
                View feed
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {posts.slice(0, 2).map((post) => (
                <ForumPostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-bold">Collaboration ideas</h2>
              <Link
                href="/partnerships"
                className="text-sm font-medium text-accent hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {collaborations.slice(0, 2).map((idea) => (
                <CollaborationCard key={idea.id} idea={idea} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
