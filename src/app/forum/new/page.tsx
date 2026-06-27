import { redirect } from "next/navigation";

export default function NewForumPostPage() {
  redirect("/dashboard/posts");
}
