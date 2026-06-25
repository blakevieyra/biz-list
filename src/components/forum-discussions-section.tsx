import Link from "next/link";
import { ForumPostCard } from "@/components/forum-post-card";
import { Card } from "@/components/ui";
import { getForumPosts } from "@/lib/data";
import type { ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

const forumCategories = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

function hiddenParamsFromBasePath(basePath: string): Record<string, string> {
  const idx = basePath.indexOf("?");
  if (idx === -1) return {};
  return Object.fromEntries(new URLSearchParams(basePath.slice(idx + 1)).entries());
}

function pathWithoutQuery(basePath: string): string {
  const idx = basePath.indexOf("?");
  return idx === -1 ? basePath : basePath.slice(0, idx);
}

function filterForumPosts<T extends { title: string; body: string; authorName: string }>(
  posts: T[],
  query?: string,
): T[] {
  if (!query?.trim()) return posts;
  const q = query.trim().toLowerCase();
  return posts.filter(
    (post) =>
      post.title.toLowerCase().includes(q) ||
      post.body.toLowerCase().includes(q) ||
      post.authorName.toLowerCase().includes(q),
  );
}

export async function ForumDiscussionsSection({
  basePath,
  category,
  query,
}: {
  basePath: string;
  category?: ForumCategory;
  query?: string;
}) {
  const posts = filterForumPosts(await getForumPosts(category), query);
  const formAction = pathWithoutQuery(basePath);
  const preservedParams = hiddenParamsFromBasePath(basePath);

  function buildHref(next: Record<string, string | undefined>) {
    const merged = {
      ...preservedParams,
      category: category ?? undefined,
      q: query || undefined,
      ...next,
    };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div>
      <section className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Topic</p>
        <div className="filter-scroll">
          <Link
            href={buildHref({ category: undefined })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              !category
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            All topics
          </Link>
          {forumCategories.map((cat) => (
            <Link
              key={cat}
              href={buildHref({ category: cat })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                category === cat
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {FORUM_CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>
      </section>

      <form action={formAction} method="get" className="mb-6 flex flex-col gap-3 sm:flex-row">
        {Object.entries(preservedParams).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        {category && <input type="hidden" name="category" value={category} />}
        <input
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Search discussions..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      {posts.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No discussions match your filters yet.{" "}
            <Link href="/forum/new" className="text-accent hover:underline">
              Start a conversation
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <ForumPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
