"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assessmentInputFromBusiness } from "@/lib/ai/assessment";
import {
  generateBusinessAssessmentAI,
  generateComprehensiveBusinessAuditAI,
  generateFreshAutomatedPostAI,
  generateMarketingCampaignDraftAI,
  generateOnboardingWelcomeAI,
  generateOutreachMessageFromLeadAI,
  generateVirtualAgentReplyAI,
  type ComprehensiveAuditResult,
} from "@/lib/ai/ai-services";
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
    const result = await generateBusinessAssessmentAI(input);
    return { success: true, assessment: { ...result, id: "demo" } };
  }

  try {
    const { supabase, user } = await requireUserWithPlan("aiAudit");

    const result = await generateBusinessAssessmentAI(input);

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
        topic_breakdown: result.topicBreakdown,
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
      await emailAssessmentComplete(profile.email, profile.display_name ?? "there", {
        businessName: input.businessName,
        overallScore: result.overallScore,
        summary: result.summary,
        recommendations: result.recommendations,
        topicBreakdown: result.topicBreakdown,
      });
    }

    revalidatePath("/dashboard/assessment");
    revalidatePath("/dashboard/profile");
    revalidatePath("/profile");
    return { success: true, assessment: { ...result, id: data.id, websiteScore: result.websiteScore, profileScore: result.profileScore, topicBreakdown: result.topicBreakdown } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Assessment failed." };
  }
}

export async function runBusinessProfileAudit() {
  if (!isSupabaseConfigured()) {
    const result = await generateBusinessAssessmentAI({
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

    const { data: businessPosts } = await supabase
      .from("business_posts")
      .select("id")
      .eq("business_id", business.id);

    const postIds = (businessPosts ?? []).map((p) => p.id);
    let commentCount = 0;
    if (postIds.length) {
      const { count } = await supabase
        .from("business_post_comments")
        .select("*", { count: "exact", head: true })
        .in("post_id", postIds);
      commentCount = count ?? 0;
    }

    const [{ count: postLikeCount }, { count: pageViewCount }, { count: offeringClickCount }, { count: followerCount }] =
      await Promise.all([
        supabase
          .from("business_content_likes")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id),
        supabase
          .from("business_page_views")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id),
        supabase
          .from("business_offering_clicks")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id),
        supabase
          .from("business_follows")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id),
      ]);

    const input = assessmentInputFromBusiness(business, {
      postCount: postCount ?? 0,
      hasHiringPost: Boolean(jobPosts?.length) || business.isHiring,
      commentCount: commentCount ?? 0,
      postLikeCount: postLikeCount ?? 0,
      pageViewCount: pageViewCount ?? 0,
      offeringClickCount: offeringClickCount ?? 0,
      followerCount: followerCount ?? 0,
    });
    const result = await generateBusinessAssessmentAI(input);

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
        topic_breakdown: result.topicBreakdown,
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
      await emailAssessmentComplete(profile.email, profile.display_name ?? "there", {
        businessName: business.name,
        overallScore: result.overallScore,
        summary: result.summary,
        recommendations: result.recommendations,
        topicBreakdown: result.topicBreakdown,
      });
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
        topicBreakdown: result.topicBreakdown,
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
    const draft = await generateFreshAutomatedPostAI(business);

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

    const campaign = await generateMarketingCampaignDraftAI(business, "social");
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
      const body = await generateOutreachMessageFromLeadAI(business, lead);
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
      const body = await generateOnboardingWelcomeAI(business, name);
      const result = await sendMessage(convo.conversationId, body);
      if (!result.error) sent += 1;
    }

    revalidatePath("/messages");
    return { message: `Welcome messages sent to ${sent} new follower${sent === 1 ? "" : "s"}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Onboarding failed." };
  }
}

export async function runComprehensiveBusinessAudit(
  auditData: Record<string, string>,
): Promise<{ result?: ComprehensiveAuditResult; error?: string }> {
  try {
    if (isSupabaseConfigured()) {
      await requireUserWithPlan("aiAudit");
    }
    const result = await generateComprehensiveBusinessAuditAI(auditData);
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Audit failed. Please try again." };
  }
}

export async function contactLead(leadUserId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return "Connect Supabase to message leads.";
  }

  try {
    const { user } = await requireUserWithPlan("localLeads");

    if (leadUserId === user.id) {
      return "You cannot message yourself.";
    }

    const { getOrCreateConversation } = await import("@/lib/actions/social");
    const result = await getOrCreateConversation(leadUserId);
    if (result.error || !result.conversationId) {
      return result.error ?? "Could not start conversation.";
    }
    redirect(`/messages/${result.conversationId}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    return e instanceof Error ? e.message : "Could not open conversation.";
  }
  return null;
}

export async function virtualAgentReply(input: {
  businessName: string;
  category: string;
  services: string;
  serviceObjects?: { name: string; description?: string; price?: string }[];
  message: string;
  tagline?: string;
  description?: string;
  city?: string;
  state?: string;
  phone?: string;
  hours?: string;
  website?: string;
  importantInfo?: string;
  isHiring?: boolean;
  agentInstructions?: string;
  agentTopicRules?: { topic: string; response: string }[];
}) {
  try {
    await requireUserWithPlan("virtualAgent");

    const services = input.serviceObjects?.length
      ? input.serviceObjects
      : input.services
          .split(",")
          .map((name) => ({ name: name.trim(), description: "" }))
          .filter((s) => s.name);

    const reply = await generateVirtualAgentReplyAI(
      {
        business: {
          name: input.businessName,
          category: input.category,
          subcategory: "",
          tagline: input.tagline ?? "",
          description: input.description ?? "",
          city: input.city ?? "",
          state: input.state ?? "",
          phone: input.phone ?? "",
          hours: input.hours ?? "",
          website: input.website ?? "",
          importantInfo: input.importantInfo ?? "",
          isHiring: input.isHiring ?? false,
          services,
        },
        agentInstructions: input.agentInstructions,
        agentTopicRules: input.agentTopicRules,
      },
      input.message,
    );

    return { reply };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Virtual agent unavailable." };
  }
}

export async function saveAgentInstructions(input: {
  instructions: string;
  topicRules: { topic: string; response: string }[];
}) {
  try {
    const supabase = await createClient();
    if (!supabase) throw new Error("Database not configured.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in required.");

    const { error } = await supabase
      .from("businesses")
      .update({
        agent_instructions: input.instructions.trim(),
        agent_topic_rules: input.topicRules,
      })
      .eq("owner_id", user.id);

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/agent");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save." };
  }
}

export async function askListingAgent(input: {
  businessId: string;
  message: string;
  customerName?: string;
}) {
  if (!isSupabaseConfigured()) {
    return {
      reply: await generateVirtualAgentReplyAI(
        {
          business: {
            name: "Demo Business",
            category: "Local services",
            subcategory: "",
            tagline: "Serving the community",
            description: "We help local customers every day.",
            city: "Austin",
            state: "TX",
            phone: "",
            hours: "Mon–Fri 9am–5pm",
            website: "",
            isHiring: false,
            services: [{ name: "Consulting", description: "" }],
          },
          customerName: input.customerName,
        },
        input.message,
      ),
    };
  }

  try {
    const supabase = await createClient();
    if (!supabase) return { error: "Agent unavailable." };

    const { data: business } = await supabase
      .from("businesses")
      .select("*, agent_instructions, agent_topic_rules")
      .eq("id", input.businessId)
      .maybeSingle();

    if (!business) {
      return { error: "Business not found." };
    }

    const { data: owner } = await supabase
      .from("profiles")
      .select("plan_tier")
      .eq("id", business.owner_id)
      .maybeSingle();

    const ownerPlan = (owner?.plan_tier ?? "free") as PlanTier;

    if (!canAccess(ownerPlan, "virtualAgent")) {
      return { error: "Virtual agent is not active for this listing." };
    }

    // Auto-enable for Platinum; otherwise require manual toggle
    if (!business.virtual_agent_enabled && ownerPlan !== "platinum") {
      return { error: "This business has not enabled the virtual agent." };
    }

    const agentInstructions = (business.agent_instructions as string | null) ?? "";
    const agentTopicRules = Array.isArray(business.agent_topic_rules)
      ? (business.agent_topic_rules as { topic: string; response: string }[])
      : [];

    const reply = await generateVirtualAgentReplyAI(
      {
        business: {
          name: business.name,
          category: business.category,
          subcategory: business.subcategory ?? "",
          tagline: business.tagline ?? "",
          description: business.description ?? "",
          city: business.city ?? "",
          state: business.state ?? "",
          phone: business.phone ?? "",
          hours: business.hours ?? "",
          website: business.website ?? "",
          importantInfo: (business.important_info as string | null) ?? "",
          isHiring: business.is_hiring ?? false,
          services: (Array.isArray(business.services) ? business.services : []).map(
            (s: { name?: string; description?: string; price?: string }) => ({
              name: s.name ?? "Service",
              description: s.description ?? "",
              price: s.price,
            }),
          ),
        },
        customerName: input.customerName,
        agentInstructions: agentInstructions || undefined,
        agentTopicRules: agentTopicRules.length ? agentTopicRules : undefined,
      },
      input.message,
    );

    return { reply };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Agent unavailable." };
  }
}

export async function toggleVirtualAgent(enabled: boolean) {
  if (!isSupabaseConfigured()) {
    return { success: true, enabled };
  }

  try {
    const { supabase, user } = await requireUserWithPlan("virtualAgent");
    const business = await loadOwnerBusiness(user.id);

    const { error } = await supabase
      .from("businesses")
      .update({ virtual_agent_enabled: enabled })
      .eq("id", business.id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/agent");
    revalidatePath(`/listings/${business.id}`);
    revalidatePath("/dashboard/profile");
    return { success: true, enabled };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update agent." };
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
    const draft = await generateMarketingCampaignDraftAI(business, channel);

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
