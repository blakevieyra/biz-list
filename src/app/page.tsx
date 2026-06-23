import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import { CollaborationCard } from "@/components/collaboration-card";
import { ForumPostCard } from "@/components/forum-post-card";
import {
  getBusinesses,
  getCollaborations,
  getForumPosts,
} from "@/lib/data";

const features = [
  {
    title: "Business Directory",
    description:
      "List your business or organization so customers and partners can find you by location, category, and what you need.",
    href: "/directory",
  },
  {
    title: "Connect & Follow",
    description:
      "Follow other businesses, build your network, and stay updated on local organizations hiring or seeking customers.",
    href: "/directory",
  },
  {
    title: "Community Forum",
    description:
      "Ask questions, share legal lessons learned, discuss local issues, and comment on posts from peers.",
    href: "/forum",
  },
  {
    title: "Joint Ventures",
    description:
      "Propose collaboration ideas and find partners for co-marketing, pop-ups, shared services, and more.",
    href: "/collaborate",
  },
];

export default async function HomePage() {
  const [businesses, posts, collaborations] = await Promise.all([
    getBusinesses(),
    getForumPosts(),
    getCollaborations(),
  ]);

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-blue-50 to-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Local business community
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Connect. Discover. Collaborate.
            </h1>
            <p className="mt-6 text-lg text-muted">
              AllConnect is a directory and community for local businesses and
              organizations — whether you&apos;re hiring, looking for customers,
              seeking advice, or exploring joint ventures with neighbors who get
              it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/signup"
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-accent-hover"
              >
                Create your profile
              </Link>
              <Link
                href="/directory"
                className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition hover:border-accent/40"
              >
                Browse directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold">What you can do on AllConnect</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
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
                Organizations hiring, seeking customers, or open to partnerships.
              </p>
            </div>
            <Link href="/directory" className="text-sm font-medium text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
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
              <h2 className="text-2xl font-bold">Latest forum posts</h2>
              <Link href="/forum" className="text-sm font-medium text-accent hover:underline">
                View forum
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
                href="/collaborate"
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
