import { redirect } from "next/navigation";
import { MessagesHubSection } from "@/components/profile-hub-sections";
import { Card, PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getNotifications } from "@/lib/data";
import { getConversations } from "@/lib/data/messages";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function MessagesPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Messages"
          description="Conversations and alerts from businesses and your community."
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

  const [conversations, notifications] = await Promise.all([
    getConversations(userId),
    getNotifications(userId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Messages"
        description="Chat with businesses and see your alerts in one inbox."
      />

      <MessagesHubSection
        conversations={conversations}
        notifications={notifications.slice(0, 12)}
      />
    </div>
  );
}
