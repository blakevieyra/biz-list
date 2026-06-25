"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createForumPost } from "@/lib/actions/social";
import { Card, PageHeader } from "@/components/ui";
import type { ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

export default function NewForumPostPage() {
  const router = useRouter();
  const [category, setCategory] = useState<ForumCategory>("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/partnerships?tab=forum" className="text-sm text-accent hover:underline">
        ← Back
      </Link>
      <PageHeader
        title="Create a forum post"
        description="Share a question, legal lesson learned, local tip, or partnership idea."
      />
      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              setError(null);
              const result = await createForumPost({ category, title, body });
              if (result.error) {
                setError(result.error);
                return;
              }
              router.push(
                result.id
                  ? `/partnerships?tab=forum&post=${result.id}`
                  : "/partnerships?tab=forum",
              );
            });
          }}
        >
          <label className="block text-sm">
            <span className="font-medium">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ForumCategory)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
              required
            >
              {(Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[]).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {FORUM_CATEGORY_LABELS[cat]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="What's on your mind?"
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              required
              placeholder="Share details, context, or lessons learned..."
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Publishing..." : "Publish post"}
          </button>
        </form>
      </Card>
    </div>
  );
}
