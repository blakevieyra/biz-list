import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessById, getCurrentProfile } from "@/lib/data";
import { canAccess } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import VirtualAgentClient from "./virtual-agent-client";

export default async function VirtualAgentPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile || !canAccess(profile.planTier, "virtualAgent")) redirect("/pricing");

  const supabase = await createClient();
  let businessName = profile.displayName;
  let category = "local business";
  let services = "our services";
  let tagline = "";
  let description = "";
  let city = "";
  let state = "";
  let phone = "";
  let hours = "";
  let website = "";
  let importantInfo = "";
  let isHiring = false;
  let agentEnabled = false;
  let agentInstructions = "";
  let agentTopicRules: { topic: string; response: string }[] = [];
  let totalConversations = 0;
  let recentQuestions: { customerName: string; question: string; createdAt: string }[] = [];

  if (supabase) {
    const { data: row } = await supabase
      .from("businesses")
      .select(
        "id, name, category, services, tagline, description, city, state, phone, hours, website, important_info, is_hiring, virtual_agent_enabled, agent_instructions, agent_topic_rules",
      )
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();

    if (row) {
      const business = await getBusinessById(row.id);
      if (business) {
        businessName = business.name;
        category = business.category;
        services = business.services.map((s) => s.name).join(", ") || services;
        tagline = business.tagline;
        description = business.description;
        city = business.city;
        state = business.state;
        phone = business.phone;
        hours = business.hours;
        website = business.website ?? "";
        importantInfo = business.importantInfo ?? "";
        isHiring = business.isHiring;
        agentEnabled = business.virtualAgentEnabled ?? row.virtual_agent_enabled ?? false;
      }
      agentInstructions = (row.agent_instructions as string | null) ?? "";
      agentTopicRules = Array.isArray(row.agent_topic_rules)
        ? (row.agent_topic_rules as { topic: string; response: string }[])
        : [];

      // Pull stats from messages — count conversations where business auto-replied
      const { count } = await supabase
        .from("messages")
        .select("conversation_id", { count: "exact", head: true })
        .eq("sender_id", userId)
        .ilike("body", "[Agent]%");

      totalConversations = count ?? 0;

      // Recent questions received (incoming messages to business)
      const { data: msgRows } = await supabase
        .from("messages")
        .select("body, created_at, profiles!messages_sender_id_fkey(display_name)")
        .neq("sender_id", userId)
        .in(
          "conversation_id",
          (
            await supabase
              .from("conversation_participants")
              .select("conversation_id")
              .eq("user_id", userId)
          ).data?.map((r) => r.conversation_id) ?? [],
        )
        .order("created_at", { ascending: false })
        .limit(5);

      recentQuestions = (msgRows ?? []).map((r) => {
        const profiles = r.profiles as { display_name: string } | { display_name: string }[] | null;
        const name = Array.isArray(profiles)
          ? (profiles[0]?.display_name ?? "Customer")
          : (profiles?.display_name ?? "Customer");
        return { customerName: name, question: r.body, createdAt: r.created_at };
      });
    }
  }

  return (
    <VirtualAgentClient
      businessName={businessName}
      category={category}
      services={services}
      tagline={tagline}
      description={description}
      city={city}
      state={state}
      phone={phone}
      hours={hours}
      website={website}
      importantInfo={importantInfo}
      isHiring={isHiring}
      agentEnabled={agentEnabled}
      agentInstructions={agentInstructions}
      agentTopicRules={agentTopicRules}
      totalConversations={totalConversations}
      recentQuestions={recentQuestions}
    />
  );
}
