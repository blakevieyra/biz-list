import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/plans";
import { isClaudeConfigured, getClaudeModel } from "@/lib/ai/claude-client";
import { generateVirtualAgentReply } from "@/lib/ai/virtual-agent";
import type { PlanTier } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { businessId, message } = body ?? {};

  if (!businessId || !message?.trim()) {
    return NextResponse.json({ error: "Missing businessId or message." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    // Demo fallback
    const fallback = generateVirtualAgentReply(
      { business: { name: "Demo Business", category: "Local services", subcategory: "", tagline: "", description: "", city: "Austin", state: "TX", phone: "", hours: "", website: "", isHiring: false, services: [] } },
      message,
    );
    return new Response(
      `data: ${JSON.stringify({ type: "text", text: fallback })}\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, category, subcategory, tagline, description, city, state, phone, hours, website, services, is_hiring, virtual_agent_enabled, agent_instructions, agent_topic_rules, agent_automations, owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: ownerRow } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", business.owner_id)
    .maybeSingle();

  const ownerPlan = (ownerRow?.plan_tier ?? "free") as PlanTier;

  if (!canAccess(ownerPlan, "virtualAgent")) {
    return NextResponse.json({ error: "Virtual agent not available for this listing." }, { status: 403 });
  }

  if (!business.virtual_agent_enabled && ownerPlan !== "platinum") {
    return NextResponse.json({ error: "Virtual agent not enabled for this business." }, { status: 403 });
  }

  const agentInstructions = (business.agent_instructions as string | null) ?? "";
  const agentTopicRules: { topic: string; response: string }[] = Array.isArray(business.agent_topic_rules)
    ? (business.agent_topic_rules as { topic: string; response: string }[])
    : [];
  const automations = (business.agent_automations ?? {}) as {
    orderingServices?: { enabled?: boolean; instructions?: string };
  };

  const topicRulesBlock = agentTopicRules.length
    ? `\n\nTopic rules (apply when relevant):\n${agentTopicRules.map((r) => `- "${r.topic}": ${r.response}`).join("\n")}`
    : "";

  const instructionsBlock = agentInstructions.trim()
    ? `\n\nOwner instructions:\n${agentInstructions}`
    : "";

  const serviceList = Array.isArray(business.services)
    ? (business.services as { name: string }[]).map((s) => s.name).join(", ")
    : "";

  const businessContext = `Business name: ${business.name}
Category: ${business.category}${business.subcategory ? ` / ${business.subcategory}` : ""}
Location: ${[business.city, business.state].filter(Boolean).join(", ") || "not set"}
Phone: ${business.phone || "not set"}
Hours: ${business.hours || "not set"}
Website: ${business.website || "not set"}
Tagline: ${business.tagline || ""}
Description: ${business.description || ""}
Services: ${serviceList || "not set"}
Currently hiring: ${business.is_hiring ? "Yes" : "No"}`;

  if (!isClaudeConfigured()) {
    const ctx = {
      business: {
        name: business.name, category: business.category, subcategory: business.subcategory ?? "",
        tagline: business.tagline ?? "", description: business.description ?? "",
        city: business.city ?? "", state: business.state ?? "",
        phone: business.phone ?? "", hours: business.hours ?? "",
        website: business.website ?? "", isHiring: !!business.is_hiring,
        services: Array.isArray(business.services)
          ? (business.services as { name: string; description?: string }[]).map((s) => ({ name: s.name, description: s.description ?? "" }))
          : [],
      },
      agentInstructions,
      agentTopicRules,
    };
    const fallback = generateVirtualAgentReply(ctx, message);
    return new Response(
      `data: ${JSON.stringify({ type: "text", text: fallback })}\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  const apiKey = process.env.CLAUDE_API_KEY!.trim();

  const model = getClaudeModel();
  const systemPrompt = `You are the virtual assistant for a local business on BizList. Reply warmly and helpfully in under 100 words. Use ONLY facts from the business profile below. If unsure, say you'll connect them with the team. Never invent prices, hours, or services not in the profile. Do not say you are an AI.${topicRulesBlock}${instructionsBlock}${automations.orderingServices?.enabled && automations.orderingServices.instructions ? `\n\nOrdering/booking instructions: ${automations.orderingServices.instructions}` : ""}`;

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 350,
      temperature: 0.6,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: `${businessContext}\n\nCustomer question: ${message}` }],
    }),
  }).catch((e) => { console.error("[agent/stream] fetch error:", e); return null; });

  if (!upstream?.ok || !upstream.body) {
    const errBody = upstream ? await upstream.json().catch(() => ({})) as { error?: { message?: string } } : {};
    console.error("[agent/stream] API error:", upstream?.status, errBody?.error?.message ?? errBody);

    // Graceful fallback: use template-based reply when Claude is unavailable
    const ctx = {
      business: {
        name: business.name, category: business.category, subcategory: business.subcategory ?? "",
        tagline: business.tagline ?? "", description: business.description ?? "",
        city: business.city ?? "", state: business.state ?? "",
        phone: business.phone ?? "", hours: business.hours ?? "",
        website: business.website ?? "", isHiring: !!business.is_hiring,
        services: Array.isArray(business.services)
          ? (business.services as { name: string; description?: string }[]).map((s) => ({ name: s.name, description: s.description ?? "" }))
          : [],
      },
      agentInstructions,
      agentTopicRules,
    };
    const fallback = generateVirtualAgentReply(ctx, message);
    return new Response(
      `data: ${JSON.stringify({ type: "text", text: fallback })}\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
