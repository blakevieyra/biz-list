import { redirect } from "next/navigation";
import { FollowingList } from "@/components/profile-hub-sections";
import { getAuthUserId } from "@/lib/actions/auth";
import { getFollowedBusinesses } from "@/lib/data";

export default async function DashboardFollowingPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const following = await getFollowedBusinesses(userId);

  return <FollowingList businesses={following} />;
}
