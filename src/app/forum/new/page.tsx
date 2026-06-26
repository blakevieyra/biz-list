import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { NewForumPostForm } from "@/components/new-forum-post-form";

const ALLOWED_ROLES = ["business", "organization", "marketer"];

export default async function NewForumPostPage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/auth/login");
  if (!ALLOWED_ROLES.includes(profile.role)) redirect("/forum");

  return <NewForumPostForm />;
}
