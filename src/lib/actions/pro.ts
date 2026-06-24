"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateBusinessAssessment, assessmentInputFromBusiness } from "@/lib/ai/assessment";
import {
  generateAutomatedPost,
  generateMarketingCampaignDraft,
  generateOnboardingWelcome,
  generateOutreachMessage,
} from "@/lib/ai/platinum-automation";
import { emailAssessmentComplete } from "@/lib/email/actions";
import { canAccess } from "@/lib/plans";
import type { PlanFeature } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PlanTier } from "@/lib/types";
import { getBusinessByOwnerId } from "@/lib/data";
import { getLocalLeads } from "@/lib/data/pro";

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
    revalidatePath("/dashboard/profile");
    revalidatePath("/profile");
    return { success: true, assessment: { ...result, id: data.id, websiteScore: result.websiteScore, profileScore: result.profileScore } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Assessment failed." };
  }
}

export async function runBusinessProfileAudit() {
  if (!isSupabaseConfigured()) {
    const result = generateBusinessAssessment({
      websiteUrl: "https://example.com",
      businessName: "Demo Business",
      category: "Retail & Community",
      description: "A local shop serving the community with curated goods.",
      city: "Austin",
      state: "TX",
      tagline: "Your neighborhood market",
    });
    return { success: true, assessment: { ...result, id: "demo" } };
  }

  try {
    const { supabase, user } = await requireUserWithPlan("aiAudit");
    const business = await getBusinessByOwnerId(user.id);
    if (!business) return { error: "Set up your business listing before running an audit." };

    const { count: postCount } = await supabase
      .from("business_posts")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id);

    const { data: jobPosts } = await supabase
      .from("business_posts")
      .select("id")
      .eq("business_id", business.id)
      .eq("post_type", "job")
      .limit(1);

    const input = assessmentInputFromBusiness(business, {
      postCount: postCount ?? 0,
      hasHiringPost: Boolean(jobPosts?.length) || business.isHiring,
    });
    const result = generateBusinessAssessment(input);

    const { data, error } = await supabase
      .from("ai_assessments")
      .insert({
        user_id: user.id,
        business_id: business.id,
        website_url: business.website ?? "",
        business_name: business.name,
        category: business.category,
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

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/assessment");
    revalidatePath("/profile");
    return {
      success: true,
      assessment: {
        ...result,
        id: data.id,
        websiteScore: result.websiteScore,
        profileScore: result.profileScore,
      },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Audit failed." };
  }
}

async function loadOwnerBusiness(userId: string) {
  const business = await getBusinessByOwnerId(userId);
  if (!business) throw new Error("Set up your business listing first.");
  return business;
}

export async function generatePlatinumPost(): Promise<{ message?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { message: "Demo: automated post drafted and published." };
  }

  try {
    const { supabase, user } = await requireUserWithPlan("automatedMarketing");
    const business = await loadOwnerBusiness(user.id);
    const draft = generateAutomatedPost(business);

    const { error } = await supabase.from("business_posts").insert({
      business_id: business.id,
      author_id: user.id,
      post_type: draft.postType,
      title: draft.title,
      body: draft.body,
      media_urls: business.mediaUrls.slice(0, 1),
      engagement_score: 5,
      is_trending: false,
    });

    if (error) return { error: error.message };

    const campaign = generateMarketingCampaignDraft(business, "social");
    await supabase.from("marketing_campaigns").insert({
      user_id: user.id,
      business_id: business.id,
      title: campaign.title,
      channel: "social",
      content: campaign.content,
      status: "sent",
    });

    revalidatePath("/dashboard/posts");
    revalidatePath("/dashboard/marketing");
    revalidatePath("/feed");
    revalidatePath(`/listings/${business.id}`);
    return { message: `Published automated post: "${draft.title}"` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Auto-post failed." };
  }
}

export async function automatePlatinumOutreach(): Promise<{ message?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { message: "Demo: outreach sent to top matched leads." };
  }

  try {
    const { user } = await requireUserWithPlan("virtualAgent");
    const business = await loadOwnerBusiness(user.id);
    const leads = (await getLocalLeads(user.id)).slice(0, 3);
    if (!leads.length) return { error: "No matched leads to contact yet." };

    const { getOrCreateConversation, sendMessage } = await import("@/lib/actions/social");
    let sent = 0;

    for (const lead of leads) {
      const convo = await getOrCreateConversation(lead.id);
      if (convo.error || !convo.conversationId) continue;
      const body = generateOutreachMessage(business, lead);
      const result = await sendMessage(convo.conversationId, body);
      if (!result.error) sent += 1;
    }

    revalidatePath("/messages");
    return { message: `Outreach sent to ${sent} matched lead${sent === 1 ? "" : "s"}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Outreach failed." };
  }
}

export async function runPlatinumOnboarding(): Promise<{ message?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { message: "Demo: welcome messages sent to recent followers." };
  }

  try {
    const { supabase, user } = await requireUserWithPlan("virtualAgent");
    const business = await loadOwnerBusiness(user.id);

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: follows } = await supabase
      .from("business_follows")
      .select("follower_id, created_at, profiles(display_name)")
      .eq("business_id", business.id)
      .gte("created_at", since)
      .limit(5);

    if (!follows?.length) {
      return { error: "No new followers in the last 7 days to onboard." };
    }

    const { getOrCreateConversation, sendMessage } = await import("@/lib/actions/social");
    let sent = 0;

    for (const follow of follows) {
      const profile = Array.isArray(follow.profiles) ? follow.profiles[0] : follow.profiles;
      const name = profile?.display_name ?? "there";
      const convo = await getOrCreateConversation(follow.follower_id);
      if (convo.error || !convo.conversationId) continue;
      const body = generateOnboardingWelcome(business, name);
      const result = await sendMessage(convo.conversationId, body);
      if (!result.error) sent += 1;
    }

    revalidatePath("/messages");
    return { message: `Welcome messages sent to ${sent} new follower${sent === 1 ? "" : "s"}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Onboarding failed." };
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

export async function generatePlatinumMarketingDraft(
  channel: "email" | "social" | "local" = "email",
): Promise<{ message?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { message: "Demo campaign draft created." };
  }

  try {
    const { supabase, user } = await requireUserWithPlan("automatedMarketing");
    const business = await loadOwnerBusiness(user.id);
    const draft = generateMarketingCampaignDraft(business, channel);

    const { error } = await supabase.from("marketing_campaigns").insert({
      user_id: user.id,
      business_id: business.id,
      title: draft.title,
      channel,
      content: draft.content,
      status: "draft",
    });

    if (error) return { error: error.message };

    revalidatePath("/dashboard/marketing");
    return { message: `Draft campaign created: ${draft.title}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to generate campaign." };
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
