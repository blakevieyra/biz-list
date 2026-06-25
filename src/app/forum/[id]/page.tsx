import { redirect } from "next/navigation";

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/partnerships?tab=forum&post=${encodeURIComponent(id)}`);
}
