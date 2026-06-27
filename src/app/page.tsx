import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { FeedPostCard } from "@/components/feed-post-card";
import { HeroCyclingText } from "@/components/hero-cycling-text";
import { CollaborationGridCard } from "@/components/collaboration-grid-card";
import { EventCard } from "@/components/event-card";
import {
  getBusinesses,
  getCollaborations,
  getCurrentProfile,
} from "@/lib/data";
import { getTrendingBusinessPosts } from "@/lib/data/business";
import { getBusinessEvents } from "@/lib/data/events";
import { resolveAreaScope } from "@/lib/feed/location-scope";
import { StarRating } from "@/components/ui";

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
    title: "Events",
    description:
      "Discover and RSVP to local business events — grand openings, pop-ups, workshops, and community gatherings.",
    href: "/events",
  },
];

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect("/home");
  }

  const areaScope = resolveAreaScope(undefined, undefined);

  const [businesses, collaborations, trendingPosts, events] = await Promise.all([
    getBusinesses({ areaScope, viewer: null }),
    getCollaborations(),
    getTrendingBusinessPosts(3),
    getBusinessEvents({ limit: 2, upcomingOnly: false }),
  ]);

  return (
    <>
      {/* ── Hero ── */}
      <section className="border-b border-border">
        <div className="lg:grid lg:min-h-screen lg:grid-cols-2">
          <div className="flex items-center bg-gradient-to-br from-blue-50 via-background to-background px-4 py-20 sm:px-6 sm:py-24 lg:justify-end lg:py-0 lg:pr-12 xl:pr-20">
            <div className="w-full max-w-lg">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
                BizList
              </p>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Your Business.<br /><HeroCyclingText />
              </h1>
              <p className="mt-5 text-xl font-medium text-muted sm:text-2xl">
                Space for Listings, Events and B2B Collaboration.
              </p>

              {businesses.length > 0 && (
                <div className="mt-6 flex flex-col gap-2">
                  {businesses.slice(0, 3).map((b) => (
                    <Link
                      key={b.id}
                      href={`/listings/${b.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-3 py-2.5 text-sm transition hover:border-accent/40 hover:bg-card"
                    >
                      {b.mediaUrls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.mediaUrls[0]}
                          alt={b.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent/50">
                          {b.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium leading-tight">{b.name}</p>
                        <p className="truncate text-xs text-muted">{b.category} · {b.city}, {b.state}</p>
                      </div>
                      {b.ratingCount > 0 && (
                        <div className="shrink-0">
                          <StarRating rating={b.ratingAvg} count={b.ratingCount} size="sm" />
                        </div>
                      )}
                    </Link>
                  ))}
                  <Link href="/listings" className="mt-1 text-xs font-medium text-accent hover:underline">
                    View all businesses →
                  </Link>
                </div>
              )}

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

          <div className="relative min-h-[360px] w-full sm:min-h-[480px] lg:min-h-full">
            <Image
              src="/hero-bizlist.jpg"
              alt="Local business interior"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/20 to-transparent lg:from-transparent" />
            <p className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              Photo: Unsplash
            </p>
          </div>
        </div>
      </section>

      {/* ── What you can do ── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">What you can do on BizList</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group flex flex-col rounded-2xl border border-border bg-card p-8 transition hover:border-accent/40 hover:shadow-md"
            >
              <h3 className="text-xl font-bold group-hover:text-accent">{feature.title}</h3>
              <p className="mt-3 flex-1 text-base leading-relaxed text-muted">{feature.description}</p>
              <span className="mt-5 text-sm font-medium text-accent">Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Live content: Business updates | Collaboration | Events ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-3">

          {/* Column 1 — Business updates */}
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">Business updates</h2>
                <p className="mt-1 text-sm text-muted">
                  Updates, jobs, and deals from nearby businesses.
                </p>
              </div>
              <Link href="/feed" className="shrink-0 text-sm font-medium text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {trendingPosts.length > 0 ? (
                trendingPosts.map((post) => (
                  <FeedPostCard key={post.id} post={post} currentUserId={null} />
                ))
              ) : (
                <p className="text-sm text-muted">No business updates yet.</p>
              )}
            </div>
          </div>

          {/* Column 2 — Collaboration ideas */}
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
                <CollaborationGridCard key={idea.id} idea={idea} currentUserId={null} />
              ))}
              {collaborations.length === 0 && (
                <p className="text-sm text-muted">No collaboration ideas yet.</p>
              )}
            </div>
          </div>

          {/* Column 3 — Events */}
          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold sm:text-2xl">Upcoming events</h2>
              <Link
                href="/events"
                className="shrink-0 text-sm font-medium text-accent hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {events.slice(0, 2).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {events.length === 0 && (
                <p className="text-sm text-muted">No upcoming events yet.</p>
              )}
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
