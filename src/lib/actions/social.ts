"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { BusinessIntent, ForumCategory, UserRole } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in.");

  return { supabase, user };
}

async function createNotification(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  params: {
    userId: string;
    type: "follow" | "connection" | "comment" | "message" | "collaboration";
    title: string;
    body: string;
    link: string;
  },
) {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
  });
}

export async function saveProfile(input: {
  displayName: string;
  role: UserRole;
  bio: string;
  city: string;
  state: string;
  forumInterests: ForumCategory[];
  businessName?: string;
  tagline?: string;
  description?: string;
  category?: string;
  intents?: BusinessIntent[];
}) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Profile saved in demo mode only." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: input.displayName,
        role: input.role,
        bio: input.bio,
        city: input.city,
        state: input.state,
        forum_interests: input.forumInterests,
      })
      .eq("id", user.id);

    if (profileError) return { error: profileError.message };

    const isBusiness = input.role === "business" || input.role === "organization";

    if (isBusiness && input.businessName) {
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      const businessPayload = {
        owner_id: user.id,
        name: input.businessName,
        tagline: input.tagline ?? "",
        description: input.description ?? "",
        category: input.category ?? "",
        city: input.city,
        state: input.state,
        intents: input.intents ?? [],
      };

      if (existing) {
        await supabase.from("businesses").update(businessPayload).eq("id", existing.id);
      } else {
        await supabase.from("businesses").insert(businessPayload);
      }
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save profile." };
  }
}

export async function toggleFollowBusiness(businessId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to follow businesses." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { data: existing } = await supabase
      .from("business_follows")
      .select("id")
      .eq("business_id", businessId)
      .eq("follower_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("business_follows").delete().eq("id", existing.id);
    } else {
      await supabase.from("business_follows").insert({
        business_id: businessId,
        follower_id: user.id,
      });

      const { data: business } = await supabase
        .from("businesses")
        .select("name, owner_id")
        .eq("id", businessId)
        .single();

      if (business && business.owner_id !== user.id) {
        const { data: follower } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        await createNotification(supabase, {
          userId: business.owner_id,
          type: "follow",
          title: "New follower",
          body: `${follower?.display_name ?? "Someone"} followed ${business.name}`,
          link: `/directory/${businessId}`,
        });
      }
    }

    revalidatePath(`/directory/${businessId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update follow." };
  }
}

export async function requestConnection(businessId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to connect with businesses." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { data: business } = await supabase
      .from("businesses")
      .select("name, owner_id")
      .eq("id", businessId)
      .single();

    if (!business) return { error: "Business not found." };
    if (business.owner_id === user.id) {
      return { error: "You cannot connect with your own business." };
    }

    const { error } = await supabase.from("business_connections").upsert(
      {
        requester_id: user.id,
        business_id: businessId,
        status: "pending",
      },
      { onConflict: "requester_id,business_id" },
    );

    if (error) return { error: error.message };

    const { data: requester } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    await createNotification(supabase, {
      userId: business.owner_id,
      type: "connection",
      title: "Connection request",
      body: `${requester?.display_name ?? "Someone"} wants to connect with ${business.name}`,
      link: `/directory/${businessId}`,
    });

    revalidatePath(`/directory/${businessId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to request connection." };
  }
}

export async function createForumPost(input: {
  category: ForumCategory;
  title: string;
  body: string;
}) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to publish forum posts." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { data, error } = await supabase
      .from("forum_posts")
      .insert({
        author_id: user.id,
        category: input.category,
        title: input.title,
        body: input.body,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    revalidatePath("/forum");
    return { success: true, id: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create post." };
  }
}

export async function createComment(postId: string, body: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to post comments." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("forum_comments").insert({
      post_id: postId,
      author_id: user.id,
      body,
    });

    if (error) return { error: error.message };

    const { data: post } = await supabase
      .from("forum_posts")
      .select("author_id, title")
      .eq("id", postId)
      .single();

    if (post && post.author_id !== user.id) {
      const { data: commenter } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      await createNotification(supabase, {
        userId: post.author_id,
        type: "comment",
        title: "New comment on your post",
        body: `${commenter?.display_name ?? "Someone"} commented on "${post.title}"`,
        link: `/forum/${postId}`,
      });
    }

    revalidatePath(`/forum/${postId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to post comment." };
  }
}

export async function createCollaboration(input: {
  title: string;
  summary: string;
  lookingFor: string;
  location: string;
  businessId?: string;
}) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to publish collaboration ideas." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("collaborations").insert({
      author_id: user.id,
      business_id: input.businessId ?? null,
      title: input.title,
      summary: input.summary,
      looking_for: input.lookingFor,
      location: input.location,
    });

    if (error) return { error: error.message };

    revalidatePath("/collaborate");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create collaboration." };
  }
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  revalidatePath("/notifications");
}

function orderedParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversation(
  otherUserId: string,
  businessId?: string,
) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to send messages." };
  }

  try {
    const { supabase, user } = await requireUser();
    const [participantA, participantB] = orderedParticipants(user.id, otherUserId);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_a", participantA)
      .eq("participant_b", participantB)
      .maybeSingle();

    if (existing) return { conversationId: existing.id };

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        participant_a: participantA,
        participant_b: participantB,
        business_id: businessId ?? null,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    return { conversationId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to start conversation." };
  }
}

export async function sendMessage(conversationId: string, body: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to send messages." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
    });

    if (error) return { error: error.message };

    const { data: conversation } = await supabase
      .from("conversations")
      .select("participant_a, participant_b")
      .eq("id", conversationId)
      .single();

    if (conversation) {
      const recipientId =
        conversation.participant_a === user.id
          ? conversation.participant_b
          : conversation.participant_a;

      const { data: sender } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      await createNotification(supabase, {
        userId: recipientId,
        type: "message",
        title: "New message",
        body: `${sender?.display_name ?? "Someone"} sent you a message`,
        link: `/messages/${conversationId}`,
      });
    }

    revalidatePath(`/messages/${conversationId}`);
    revalidatePath("/messages");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send message." };
  }
}

export async function startMessageWithBusinessOwner(businessId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to send messages." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: business } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .single();

  if (!business) return { error: "Business not found." };

  const result = await getOrCreateConversation(business.owner_id, businessId);
  if ("error" in result && result.error) return { error: result.error };
  if (!result.conversationId) return { error: "Could not create conversation." };

  return { conversationId: result.conversationId };
}
