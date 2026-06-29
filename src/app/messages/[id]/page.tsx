import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageThread } from "@/components/message-thread";
import { PageHeader } from "@/components/ui";
import {
  getConversationForUser,
  getMessages,
} from "@/lib/data/messages";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prefill?: string }>;
}) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  if (!isSupabaseConfigured()) redirect("/messages");

  const { id } = await params;
  const { prefill } = await searchParams;

  const [conversation, messages, currentProfile] = await Promise.all([
    getConversationForUser(id, userId),
    getMessages(id, userId),
    getCurrentProfile(),
  ]);

  if (!conversation) redirect("/messages");

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
        currentUserName={currentProfile?.displayName ?? "Me"}
        currentUserAvatarUrl={currentProfile?.avatarUrl}
        otherUserName={conversation.otherUserName}
        otherUserAvatarUrl={conversation.otherUserAvatarUrl}
        otherUserIsSeekingWork={conversation.otherUserIsSeekingWork}
        businessIsHiring={conversation.businessIsHiring}
        initialBody={prefill}
      />
    </div>
  );
}
