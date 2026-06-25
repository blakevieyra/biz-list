import { redirect } from "next/navigation";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    scope?: string;
    miles?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const search = new URLSearchParams();
  search.set("view", "activity");

  if (params.tab) search.set("tab", params.tab);
  if (params.scope) search.set("scope", params.scope);
  if (params.miles) search.set("miles", params.miles);
  if (params.q) search.set("q", params.q);

  redirect(`/home?${search.toString()}`);
}
