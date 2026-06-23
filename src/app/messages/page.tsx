import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader, formatDate } from "@/components/ui";
import { getConversations } from "@/lib/data/messages";
import { getAuthUserId } from "@/lib/actions/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function MessagesPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <PageHeader title="Messages" description="Direct messages with businesses and customers." />
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

  const conversations = await getConversations(userId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Messages"
        description="Chat with business owners and community members."
      />

      {conversations.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No conversations yet. Visit a business profile and click Message to start
            chatting.
          </p>
          <Link
            href="/directory"
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Browse directory
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={`/messages/${conversation.id}`}>
              <Card className="transition hover:border-accent/40 hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{conversation.otherUserName}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-muted">
                      {conversation.lastMessage ?? "Start the conversation"}
                    </p>
                  </div>
                  <div className="text-right">
                    {conversation.lastMessageAt && (
                      <p className="text-xs text-muted">
                        {formatDate(conversation.lastMessageAt)}
                      </p>
                    )}
                    {conversation.unreadCount > 0 && (
                      <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
