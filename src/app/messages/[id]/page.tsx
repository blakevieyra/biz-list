import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageThread } from "@/components/message-thread";
import { PageHeader } from "@/components/ui";
import {
  getConversationForUser,
  getMessages,
} from "@/lib/data/messages";
import { getAuthUserId } from "@/lib/actions/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  if (!isSupabaseConfigured()) redirect("/messages");

  const { id } = await params;
  const conversation = await getConversationForUser(id, userId);

  if (!conversation) notFound();

  const messages = await getMessages(id, userId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/messages" className="text-sm text-accent hover:underline">
        ← Back to messages
      </Link>
      <PageHeader
        title={conversation.otherUserName}
        description="Private conversation"
      />
      <MessageThread
        conversationId={id}
        initialMessages={messages}
        currentUserId={userId}
      />
    </div>
  );
}
