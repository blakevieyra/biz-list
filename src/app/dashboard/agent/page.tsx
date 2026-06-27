import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessById, getCurrentProfile } from "@/lib/data";
import { canAccess } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { AgentAutomations } from "@/lib/actions/pro";
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
  let serviceObjects: { name: string; description?: string; price?: string }[] = [];
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
  let agentAutomations: AgentAutomations = {};
  let totalConversations = 0;
  let recentQuestions: { customerName: string; question: string; createdAt: string }[] = [];
  let suggestedFromProfile = false;

  if (supabase) {
    const { data: row } = await supabase
      .from("businesses")
      .select(
        "id, name, category, services, tagline, description, city, state, phone, hours, website, important_info, is_hiring, virtual_agent_enabled, agent_instructions, agent_topic_rules, agent_automations",
      )
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();

    if (row) {
      const business = await getBusinessById(row.id);
      if (business) {
        businessName = business.name;
        category = business.category;
        serviceObjects = business.services;
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
      agentAutomations = (row.agent_automations as AgentAutomations) ?? {};

      // ── Auto-generate instructions from profile if not yet set ──────────────
      const hasProfile = businessName && businessName !== profile.displayName;

      if (!agentInstructions && hasProfile) {
        const topSvcs = serviceObjects.slice(0, 5).map((s) => s.name);
        const svcStr = topSvcs.length > 0 ? topSvcs.join(", ") : "";
        const loc = [city, state].filter(Boolean).join(", ");

        agentInstructions = [
          `You are the virtual assistant for ${businessName}, a ${category} business${loc ? ` in ${loc}` : ""}.`,
          `Be friendly, professional, and helpful — keep every reply under 3 sentences.`,
          svcStr ? `We specialize in: ${svcStr}.` : "",
          phone
            ? `For bookings or detailed questions, direct customers to call us at ${phone}.`
            : "For detailed questions, invite them to message us directly.",
          website ? `Our website is ${website}.` : "",
          `Never make up pricing, hours, or availability not listed here — if unsure, invite them to call or message us.`,
        ]
          .filter(Boolean)
          .join(" ");

        suggestedFromProfile = true;
      }

      // ── Auto-generate topic rules from profile if not yet set ───────────────
      if (agentTopicRules.length === 0 && hasProfile) {
        const topSvcs = serviceObjects.slice(0, 3).map((s) => s.name).join(", ");

        agentTopicRules = [
          {
            topic: "services",
            response: topSvcs
              ? `At ${businessName}, we offer ${topSvcs}${serviceObjects.length > 3 ? " and more" : ""}. Message us or check our listing for the full list and pricing.`
              : `We offer a range of ${category} services. Message us and we'll find the right fit for you.`,
          },
          {
            topic: "hours",
            response: hours
              ? `We're open ${hours}. Feel free to call or message ahead to confirm.`
              : `Our hours can vary — message us or check our BizList listing for current availability.`,
          },
          {
            topic: "pricing",
            response: `Pricing depends on the specific service and your needs. ${
              phone ? `Call us at ${phone}` : "Message us here"
            } for a personalized quote — we're happy to walk you through your options.`,
          },
          {
            topic: "location",
            response: city
              ? `We're based in ${city}, ${state}.${phone ? ` Call ${phone}` : " Message us"} for directions or to confirm our current service area.`
              : `Message us for our location and service area details.`,
          },
          {
            topic: "booking",
            response: `To book or get started, ${
              phone ? `give us a call at ${phone}` : "send us a message here"
            } and we'll take care of the rest.${website ? ` You can also visit ${website}.` : ""}`,
          },
          {
            topic: "hiring",
            response: isHiring
              ? `Yes, ${businessName} is currently hiring! Send us a message here with your background and we'll share details about open positions.`
              : `We're not actively hiring right now, but feel free to send your background — we love connecting with great people.`,
          },
        ];

        suggestedFromProfile = true;
      }

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
      serviceObjects={serviceObjects}
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
      agentAutomations={agentAutomations}
      totalConversations={totalConversations}
      recentQuestions={recentQuestions}
      suggestedFromProfile={suggestedFromProfile}
    />
  );
}
