"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAppEmail } from "@/lib/email/send";

type AgentAutomations = {
  emailMe?: { enabled?: boolean; events?: string[] };
  leadOutreach?: { enabled?: boolean; message?: string };
  marketingSchedule?: { enabled?: boolean; frequency?: string };
  orderingServices?: { enabled?: boolean; instructions?: string };
};

type BusinessAutoRow = {
  owner_id: string;
  agent_automations: AgentAutomations | null;
};

type OwnerRow = {
  email: string;
  display_name: string;
};

async function getBusinessAutoConfig(businessId: string): Promise<{
  business: BusinessAutoRow;
  owner: OwnerRow;
} | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: business } = await admin
    .from("businesses")
    .select("owner_id, agent_automations")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) return null;

  const { data: owner } = await admin
    .from("profiles")
    .select("email, display_name")
    .eq("id", business.owner_id)
    .maybeSingle();

  if (!owner?.email) return null;

  return { business: business as BusinessAutoRow, owner: owner as OwnerRow };
}

export async function triggerFollowAutomations(
  businessId: string,
  businessName: string,
  followerId: string,
  followerName: string,
) {
  try {
    const config = await getBusinessAutoConfig(businessId);
    if (!config) return;

    const { business, owner } = config;
    const automations = (business.agent_automations ?? {}) as AgentAutomations;

    // emailMe — new_follower
    if (
      automations.emailMe?.enabled &&
      automations.emailMe.events?.includes("new_follower")
    ) {
      await sendAppEmail({
        to: owner.email,
        subject: `New follower: ${followerName} is now following ${businessName}`,
        title: "New follower on BizList",
        greeting: `Hi ${owner.display_name},`,
        body: `${followerName} just followed your BizList listing for <strong>${businessName}</strong>. This is a great time to say hello!`,
        ctaLabel: "View your listing",
        ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://bizlist.app"}/dashboard/leads`,
        footerNote: "You're receiving this because Email notifications are enabled in your Virtual Agent settings.",
      });
    }

    // leadOutreach — auto-send welcome message to new follower
    const outreachMsg = automations.leadOutreach?.enabled
      ? (automations.leadOutreach.message?.trim() ?? "")
      : "";

    if (outreachMsg) {
      const admin = getSupabaseAdmin()!;
      const ownerId = business.owner_id;

      // Get or create conversation between owner and new follower
      const [participantA, participantB] =
        ownerId < followerId ? [ownerId, followerId] : [followerId, ownerId];

      const { data: existing } = await admin
        .from("conversations")
        .select("id")
        .eq("participant_a", participantA)
        .eq("participant_b", participantB)
        .maybeSingle();

      let conversationId = existing?.id as string | undefined;

      if (!conversationId) {
        const { data: created } = await admin
          .from("conversations")
          .insert({
            participant_a: participantA,
            participant_b: participantB,
            business_id: businessId,
          })
          .select("id")
          .single();
        conversationId = created?.id as string | undefined;
      }

      if (conversationId) {
        await admin.from("messages").insert({
          conversation_id: conversationId,
          sender_id: ownerId,
          body: outreachMsg,
        });
      }
    }
  } catch (e) {
    console.error("[automations] triggerFollowAutomations failed:", e);
  }
}

export async function triggerNewConversationEmail(
  businessId: string,
  businessName: string,
  senderName: string,
) {
  try {
    const config = await getBusinessAutoConfig(businessId);
    if (!config) return;

    const { business, owner } = config;
    const automations = (business.agent_automations ?? {}) as AgentAutomations;

    if (
      automations.emailMe?.enabled &&
      automations.emailMe.events?.includes("new_conversation")
    ) {
      await sendAppEmail({
        to: owner.email,
        subject: `New conversation on BizList: ${senderName} messaged ${businessName}`,
        title: "New conversation on BizList",
        greeting: `Hi ${owner.display_name},`,
        body: `<strong>${senderName}</strong> started a new conversation with your business <strong>${businessName}</strong> on BizList. Reply in your inbox to keep the conversation going.`,
        ctaLabel: "Open inbox",
        ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://bizlist.app"}/messages`,
        footerNote: "You're receiving this because Email notifications are enabled in your Virtual Agent settings.",
      });
    }
  } catch (e) {
    console.error("[automations] triggerNewConversationEmail failed:", e);
  }
}
