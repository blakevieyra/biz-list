"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateBusinessAssessment } from "@/lib/ai/assessment";
import { emailAssessmentComplete } from "@/lib/email/actions";
import { canAccess } from "@/lib/plans";
import type { PlanFeature } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PlanTier } from "@/lib/types";

async function requireUserWithPlan(feature?: PlanFeature) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, role, display_name, email")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plan_tier ?? "free") as PlanTier;

  if (feature && !canAccess(plan, feature)) {
    throw new Error("Upgrade your plan to access this feature.");
  }

  return { supabase, user, profile, plan };
}

export async function runAiAssessment(input: {
  websiteUrl: string;
  businessName: string;
  category: string;
  description: string;
  city: string;
  state: string;
  tagline: string;
}) {
  if (!isSupabaseConfigured()) {
    const result = generateBusinessAssessment(input);
    return { success: true, assessment: { ...result, id: "demo" } };
  }

  try {
    const { supabase, user } = await requireUserWithPlan("aiAudit");

    const result = generateBusinessAssessment(input);

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("ai_assessments")
      .insert({
        user_id: user.id,
        business_id: business?.id ?? null,
        website_url: input.websiteUrl,
        business_name: input.businessName,
        category: input.category,
        overall_score: result.overallScore,
        seo_score: result.seoScore,
        online_presence_score: result.onlinePresenceScore,
        business_clarity_score: result.businessClarityScore,
        summary: result.summary,
        recommendations: result.recommendations,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .single();

    if (profile?.email) {
      await emailAssessmentComplete(
        profile.email,
        profile.display_name ?? "there",
        result.overallScore,
      );
    }

    revalidatePath("/dashboard/assessment");
    return { success: true, assessment: { ...result, id: data.id } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Assessment failed." };
  }
}

export async function contactLead(leadUserId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Connect Supabase to message leads.");
  }

  const { supabase, user } = await requireUserWithPlan("localLeads");

  if (leadUserId === user.id) {
    throw new Error("You cannot message yourself.");
  }

  const { isEligibleLead } = await import("@/lib/data/pro");
  const eligible = await isEligibleLead(user.id, leadUserId);
  if (!eligible) {
    throw new Error("This person is not an eligible lead for your business.");
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", leadUserId)
    .single();

  if (target?.role !== "customer") {
    throw new Error("You can only contact customer leads.");
  }

  const { getOrCreateConversation } = await import("@/lib/actions/social");
  const result = await getOrCreateConversation(leadUserId);
  if (result.error) throw new Error(result.error);
  if (!result.conversationId) throw new Error("Could not start conversation.");
  redirect(`/messages/${result.conversationId}`);
}

export async function virtualAgentReply(input: {
  businessName: string;
  category: string;
  services: string;
  message: string;
}) {
  try {
    await requireUserWithPlan("virtualAgent");

    const lower = input.message.toLowerCase();
    let reply =
      `Thanks for reaching out to ${input.businessName}. We're a ${input.category} business focused on serving our local community.`;

    if (lower.includes("price") || lower.includes("cost") || lower.includes("rate")) {
      reply += ` Our services include: ${input.services || "custom packages"}. Reply with your needs and we'll follow up with pricing.`;
    } else if (lower.includes("hours") || lower.includes("open")) {
      reply += " Check our profile for hours and contact options, or leave your email and we'll confirm availability.";
    } else if (lower.includes("hire") || lower.includes("job")) {
      reply += " We're always interested in great local talent — share your background and we'll connect you with the right person on our team.";
    } else {
      reply += " How can we help you today? We can share services, booking info, or connect you with our team.";
    }

    return { reply };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Virtual agent unavailable." };
  }
}

export async function createMarketingCampaign(input: {
  title: string;
  channel: string;
  content: string;
  scheduledFor?: string;
}) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to create campaigns." };
  }

  try {
    const { supabase, user } = await requireUserWithPlan("automatedMarketing");

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("marketing_campaigns").insert({
      user_id: user.id,
      business_id: business?.id ?? null,
      title: input.title,
      channel: input.channel,
      content: input.content,
      status: input.scheduledFor ? "scheduled" : "draft",
      scheduled_for: input.scheduledFor ?? null,
    });

    if (error) return { error: error.message };

    revalidatePath("/dashboard/marketing");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create campaign." };
  }
}
