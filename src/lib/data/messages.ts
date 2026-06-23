import { createClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/lib/types";

export async function getConversations(userId: string): Promise<Conversation[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: rows } = await supabase
    .from("conversations")
    .select("*")
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!rows?.length) return [];

  const conversations: Conversation[] = [];

  for (const row of rows) {
    const otherUserId =
      row.participant_a === userId ? row.participant_b : row.participant_a;

    const [{ data: otherProfile }, { data: lastMessage }, { count: unreadCount }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", otherUserId)
          .single(),
        supabase
          .from("messages")
          .select("body, created_at")
          .eq("conversation_id", row.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", row.id)
          .neq("sender_id", userId)
          .eq("read", false),
      ]);

    conversations.push({
      id: row.id,
      participantA: row.participant_a,
      participantB: row.participant_b,
      businessId: row.business_id ?? undefined,
      otherUserId,
      otherUserName: otherProfile?.display_name ?? "Unknown",
      lastMessage: lastMessage?.body,
      lastMessageAt: lastMessage?.created_at,
      unreadCount: unreadCount ?? 0,
      createdAt: row.created_at,
    });
  }

  return conversations.sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.createdAt;
    const bTime = b.lastMessageAt ?? b.createdAt;
    return bTime.localeCompare(aTime);
  });
}

export async function getMessages(
  conversationId: string,
  userId: string,
): Promise<Message[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: rows } = await supabase
    .from("messages")
    .select("*, profiles(display_name)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("read", false);

  return (rows ?? []).map((row) => {
    const profiles = row.profiles as
      | { display_name: string }
      | { display_name: string }[]
      | null;
    const name = Array.isArray(profiles)
      ? profiles[0]?.display_name
      : profiles?.display_name;

    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: name ?? "Unknown",
      body: row.body,
      read: row.read,
      createdAt: row.created_at,
    };
  });
}

export async function getConversationForUser(
  conversationId: string,
  userId: string,
): Promise<Conversation | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (!row) return null;
  if (row.participant_a !== userId && row.participant_b !== userId) return null;

  const otherUserId =
    row.participant_a === userId ? row.participant_b : row.participant_a;

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", otherUserId)
    .single();

  return {
    id: row.id,
    participantA: row.participant_a,
    participantB: row.participant_b,
    businessId: row.business_id ?? undefined,
    otherUserId,
    otherUserName: otherProfile?.display_name ?? "Unknown",
    unreadCount: 0,
    createdAt: row.created_at,
  };
}
