import {
  generateBusinessAssessment,
  type AssessmentInput,
  type AssessmentResult,
  type AssessmentTopic,
} from "@/lib/ai/assessment";
import {
  generateFreshAutomatedPost,
  generateOutreachMessageFromLead,
  generateVirtualAgentReply,
  type VirtualAgentContext,
} from "@/lib/ai/virtual-agent";
import {
  generateMarketingCampaignDraft,
  generateOnboardingWelcome,
} from "@/lib/ai/platinum-automation";
import { claudeComplete, claudeJSON, isClaudeConfigured } from "@/lib/ai/claude-client";
import type { BusinessProfile, LocalLead } from "@/lib/types";

function businessContextBlock(business: VirtualAgentContext["business"]): string {
  const services = business.services
    .map((s) => {
      const price = s.price?.trim() ? ` (${s.price})` : "";
      return `- ${s.name}${price}${s.description ? `: ${s.description}` : ""}`;
    })
    .join("\n");

  return [
    `Business: ${business.name}`,
    `Category: ${business.category}${business.subcategory ? ` › ${business.subcategory}` : ""}`,
    `Location: ${[business.city, business.state].filter(Boolean).join(", ") || "Not listed"}`,
    `Tagline: ${business.tagline || "None"}`,
    `Description: ${business.description || "None"}`,
    `Phone: ${business.phone || "Not listed"}`,
    `Hours: ${business.hours || "Not listed"}`,
    `Website: ${business.website || "Not listed"}`,
    `Hiring: ${business.isHiring ? "Yes" : "No"}`,
    services ? `Services:\n${services}` : "Services: None listed",
  ].join("\n");
}

type AuditEnhancement = {
  summary?: string;
  recommendations?: string[];
  topics?: {
    id: string;
    summary?: string;
    findings?: string[];
    actions?: string[];
  }[];
};

function mergeAssessment(base: AssessmentResult, enhanced: AuditEnhancement): AssessmentResult {
  const topicMap = new Map((enhanced.topics ?? []).map((t) => [t.id, t]));

  const topicBreakdown: AssessmentTopic[] = base.topicBreakdown.map((topic) => {
    const patch = topicMap.get(topic.id);
    if (!patch) return topic;
    return {
      ...topic,
      summary: patch.summary?.trim() || topic.summary,
      findings: patch.findings?.length ? patch.findings : topic.findings,
      actions: patch.actions?.length ? patch.actions : topic.actions,
    };
  });

  return {
    ...base,
    summary: enhanced.summary?.trim() || base.summary,
    recommendations: enhanced.recommendations?.length ? enhanced.recommendations : base.recommendations,
    topicBreakdown,
  };
}

export async function generateBusinessAssessmentAI(input: AssessmentInput): Promise<AssessmentResult> {
  const base = generateBusinessAssessment(input);
  if (!isClaudeConfigured()) return base;

  const metrics = JSON.stringify(
    {
      websiteUrl: input.websiteUrl,
      businessName: input.businessName,
      category: input.category,
      subcategory: input.subcategory,
      city: input.city,
      state: input.state,
      county: input.county,
      zipCode: input.zipCode,
      tagline: input.tagline,
      phone: input.phone,
      hours: input.hours,
      mediaCount: input.mediaCount,
      servicesCount: input.servicesCount,
      socialLinkCount: input.socialLinkCount,
      reviewCount: input.reviewCount,
      ratingAvg: input.ratingAvg,
      postCount: input.postCount,
      followerCount: input.followerCount,
      commentCount: input.commentCount,
      postLikeCount: input.postLikeCount,
      pageViewCount: input.pageViewCount,
      offeringClickCount: input.offeringClickCount,
      hasHiringPost: input.hasHiringPost,
      hasCoordinates: input.hasCoordinates,
    },
    null,
    2,
  );

  const scores = base.topicBreakdown.map((t) => ({ id: t.id, label: t.label, score: t.score }));

  const enhanced = await claudeJSON<AuditEnhancement>({
    system: `You are a local business marketing analyst for BizList. Given real profile metrics and pre-calculated scores, write detailed, specific audit narratives. Do NOT change scores. Be honest and actionable. Reference actual metrics (post counts, views, location, industry).`,
    user: `Business metrics:\n${metrics}\n\nTopic scores (fixed — do not change):\n${JSON.stringify(scores, null, 2)}\n\nReturn JSON:\n{\n  "summary": "2-3 sentence overall assessment",\n  "recommendations": ["up to 8 prioritized actions"],\n  "topics": [\n    {\n      "id": "website|seo|presence|clarity|profile|content|industry|location",\n      "summary": "one sentence",\n      "findings": ["2-4 specific observations from the data"],\n      "actions": ["1-3 concrete next steps"]\n    }\n  ]\n}`,
    maxTokens: 2500,
    temperature: 0.4,
  });

  if (!enhanced) return base;
  return mergeAssessment(base, enhanced);
}

export async function generateVirtualAgentReplyAI(
  ctx: VirtualAgentContext,
  message: string,
): Promise<string> {
  const fallback = generateVirtualAgentReply(ctx, message);
  if (!isClaudeConfigured()) return fallback;

  const firstName = ctx.customerName?.split(" ")[0] || "there";

  const topicRulesBlock =
    ctx.agentTopicRules?.length
      ? `\n\nTopic response rules (follow these when applicable):\n${ctx.agentTopicRules
          .map((r) => `- If asked about "${r.topic}": ${r.response}`)
          .join("\n")}`
      : "";

  const instructionsBlock = ctx.agentInstructions?.trim()
    ? `\n\nOwner instructions:\n${ctx.agentInstructions}`
    : "";

  const reply = await claudeComplete({
    system: `You are the virtual assistant for a local business on BizList. Reply warmly and professionally in under 120 words. Use ONLY facts from the business profile below. If something is unknown, say you'll connect them with the team. Never invent prices, hours, or services not in the profile. Do not mention that you are an AI.${topicRulesBlock}${instructionsBlock}`,
    user: `${businessContextBlock(ctx.business)}\n\nCustomer name: ${firstName}\nCustomer message: ${message}`,
    maxTokens: 350,
    temperature: 0.6,
  });

  return reply || fallback;
}

export async function generateOutreachMessageFromLeadAI(
  business: BusinessProfile,
  lead: Pick<LocalLead, "displayName" | "matchReasons" | "city" | "state" | "matchScore" | "bio" | "industryInterests">,
): Promise<string> {
  const fallback = generateOutreachMessageFromLead(business, lead);
  if (!isClaudeConfigured()) return fallback;

  const reply = await claudeComplete({
    system: `Write a short, personalized BizList direct message (under 90 words) from a local business to a potential customer. Sound human, not salesy. Mention specific match reasons. Include a soft call to reply.`,
    user: `From business:\n${businessContextBlock(business as VirtualAgentContext["business"])}\n\nTo lead:\nName: ${lead.displayName}\nLocation: ${[lead.city, lead.state].filter(Boolean).join(", ")}\nMatch score: ${lead.matchScore}%\nMatch reasons: ${lead.matchReasons.join("; ")}\nBio: ${lead.bio || "None"}\nInterests: ${(lead.industryInterests ?? []).join(", ") || "None"}`,
    maxTokens: 250,
    temperature: 0.7,
  });

  return reply || fallback;
}

export async function generateFreshAutomatedPostAI(
  business: BusinessProfile,
): Promise<{ title: string; body: string; postType: "update" | "deal" | "job" }> {
  const fallback = generateFreshAutomatedPost(business);
  if (!isClaudeConfigured()) return fallback;

  const draft = await claudeJSON<{ title: string; body: string; postType: "update" | "deal" | "job" }>({
    system: `Create a fresh BizList feed post for a local business. Use real business details only. Body should be 2-4 sentences, friendly and local. postType: "job" if hiring, "deal" if featuring a service/offer, otherwise "update".`,
    user: businessContextBlock(business as VirtualAgentContext["business"]),
    maxTokens: 400,
    temperature: 0.75,
  });

  if (!draft?.title?.trim() || !draft?.body?.trim()) return fallback;

  const postType = draft.postType === "job" || draft.postType === "deal" ? draft.postType : "update";
  return { title: draft.title.trim(), body: draft.body.trim(), postType };
}

export async function generateOnboardingWelcomeAI(
  business: BusinessProfile,
  customerName: string,
): Promise<string> {
  const fallback = generateOnboardingWelcome(business, customerName);
  if (!isClaudeConfigured()) return fallback;

  const reply = await claudeComplete({
    system: `Write a warm welcome message (under 80 words) to someone who just followed a local business on BizList. Invite them to ask questions. Use only profile facts.`,
    user: `${businessContextBlock(business as VirtualAgentContext["business"])}\n\nNew follower name: ${customerName}`,
    maxTokens: 200,
    temperature: 0.65,
  });

  return reply || fallback;
}

export async function generateMarketingCampaignDraftAI(
  business: BusinessProfile,
  channel: "email" | "social" | "local",
): Promise<{ title: string; content: string }> {
  const fallback = generateMarketingCampaignDraft(business, channel);
  if (!isClaudeConfigured()) return fallback;

  const draft = await claudeJSON<{ title: string; content: string }>({
    system: `Create a marketing campaign draft for a local business on BizList. Channel: ${channel}. For email include Subject line. For social include 2-3 local hashtags. Keep content under 200 words.`,
    user: businessContextBlock(business as VirtualAgentContext["business"]),
    maxTokens: 500,
    temperature: 0.7,
  });

  if (!draft?.title?.trim() || !draft?.content?.trim()) return fallback;
  return { title: draft.title.trim(), content: draft.content.trim() };
}
