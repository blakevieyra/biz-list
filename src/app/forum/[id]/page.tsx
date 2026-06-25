import { redirect } from "next/navigation";

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/forum?post=${encodeURIComponent(id)}`);
}
