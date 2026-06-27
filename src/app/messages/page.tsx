import { redirect } from "next/navigation";
import { MessagesHubSection } from "@/components/profile-hub-sections";
import { Card, PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getNotifications, getCurrentProfile } from "@/lib/data";
import { getConversations } from "@/lib/data/messages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isBusinessPlan } from "@/lib/plans";

export default async function MessagesPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Messages"
          description="Alerts and conversations in one inbox."
        />
        <Card>
          <p className="text-sm text-muted">
            Connect Supabase to enable messaging. Copy{" "}
            <code className="rounded bg-slate-100 px-1">.env.local.example</code> to{" "}
            <code className="rounded bg-slate-100 px-1">.env.local</code> and run{" "}
            <code className="rounded bg-slate-100 px-1">supabase/schema.sql</code>.
          </p>
        </Card>
      </div>
    );
  }

  const [conversations, notifications, profile] = await Promise.all([
    getConversations(userId),
    getNotifications(userId),
    getCurrentProfile(),
  ]);

  const isBusinessUser = profile
    ? isBusinessPlan(profile.planTier) || profile.role !== "customer"
    : false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Messages"
        description="Alerts and conversations in one inbox."
      />

      <MessagesHubSection
        conversations={conversations}
        notifications={notifications}
        isBusinessUser={isBusinessUser}
      />
    </div>
  );
}
