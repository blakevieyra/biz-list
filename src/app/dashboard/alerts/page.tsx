import { redirect } from "next/navigation";
import { AlertsPreview } from "@/components/profile-hub-sections";
import { getAuthUserId } from "@/lib/actions/auth";
import { getNotifications } from "@/lib/data";

export default async function DashboardAlertsPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const notifications = await getNotifications(userId);

  return <AlertsPreview notifications={notifications} />;
}
