import { redirect } from "next/navigation";
import type { ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

const forumCategories = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[];

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const search = new URLSearchParams({ tab: "forum" });

  if (forumCategories.includes(params.category as ForumCategory)) {
    search.set("category", params.category as string);
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  redirect(`/partnerships?${search.toString()}`);
}
