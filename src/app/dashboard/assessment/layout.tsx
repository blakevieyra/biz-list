import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { canAccess } from "@/lib/plans";

export default async function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !canAccess(profile.planTier, "aiAudit")) {
    redirect("/pricing");
  }

  return children;
}
