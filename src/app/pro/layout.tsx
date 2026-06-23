import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile || profile.planTier !== "pro") redirect("/pricing");

  return children;
}
