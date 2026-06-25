import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
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
import { resolveAreaScope } from "@/lib/feed/location-scope";

const features = [
  {
    title: "Latest",
    description:
      "Follow business updates, open jobs, sales, deals, and local events in one scrollable feed.",
    href: "/feed",
  },
  {
    title: "Listings",
    description:
      "Browse local businesses by location and industry. Expand your radius when you need more options.",
    href: "/listings",
  },
  {
    title: "Collaboration",
    description:
      "Create B2B deals, joint ventures, work groups, sales events, and organized partnership opportunities.",
    href: "/partnerships",
  },
  {
    title: "Management",
    description:
      "Manage your profile, following, alerts, messages, and applications — business or personal — in one hub.",
    href: "/auth/signup",
  },
];

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect("/home");
  }

  const viewer = null;
  const areaScope = resolveAreaScope(undefined, undefined);

  const [businesses, posts, collaborations, trendingPosts] = await Promise.all([
    getBusinesses({ areaScope, viewer }),
    getForumPosts(),
    getCollaborations(),
    getTrendingBusinessPosts(3),
  ]);

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-blue-50 to-background lg:grid lg:grid-cols-2">
        <div className="flex items-center px-4 py-12 sm:px-6 sm:py-20 lg:justify-end lg:pr-12 xl:pr-16">
          <div className="w-full max-w-xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your Business. The latest. Listings. Collaboration.
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
                Explore latest
              </Link>
            </div>
          </div>
        </div>
        <div className="relative min-h-[280px] w-full sm:min-h-[360px] lg:min-h-[520px]">
          <Image
            src="/hero-BizList.jpg"
            alt="Local restaurant interior"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <p className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            Photo: Unsplash
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold">What you can do on BizList</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Featured businesses</h2>
              <p className="mt-2 text-muted">
                {viewer
                  ? `Near your zip code and matching your interests in your ${areaScope} area.`
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
        <div className="grid gap-10 lg:grid-cols-3">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">Local business updates</h2>
                <p className="mt-1 text-sm text-muted">
                  Updates, jobs, and deals from nearby businesses.
                </p>
              </div>
              <Link href="/feed" className="shrink-0 text-sm font-medium text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-6">
              {trendingPosts.length > 0 ? (
                <BusinessPostFeed posts={trendingPosts} embedded />
              ) : (
                <p className="text-sm text-muted">No business updates yet.</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold sm:text-2xl">Latest from the feed</h2>
              <Link
                href="/feed?tab=discussions"
                className="shrink-0 text-sm font-medium text-accent hover:underline"
              >
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
              <h2 className="text-xl font-bold sm:text-2xl">Collaboration ideas</h2>
              <Link
                href="/partnerships"
                className="shrink-0 text-sm font-medium text-accent hover:underline"
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
