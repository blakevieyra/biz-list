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
    business.importantInfo ? `Important info: ${business.importantInfo}` : "",
  ].filter(Boolean).join("\n");
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

export type ComprehensiveAuditSection = {
  id: string;
  label: string;
  phase: "internal" | "external";
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  actions: string[];
};

export type ComprehensiveAuditResult = {
  overallScore: number;
  internalScore: number;
  externalScore: number;
  executiveSummary: string;
  sections: ComprehensiveAuditSection[];
  priorityActions: {
    priority: "high" | "medium" | "low";
    action: string;
    category: string;
    impact: string;
  }[];
};

const FALLBACK_AUDIT: ComprehensiveAuditResult = {
  overallScore: 62,
  internalScore: 60,
  externalScore: 64,
  executiveSummary:
    "Your business has a solid foundation with clear opportunities to strengthen operations, pricing, and online visibility. Addressing the identified gaps in a structured way will unlock meaningful growth over the next 12 months.",
  sections: [
    { id: "operations", label: "Operations", phase: "internal", score: 58, summary: "Core workflows exist but documentation gaps create inconsistency.", strengths: ["Day-to-day tasks are understood by the team", "Clear service delivery"], gaps: ["No documented SOPs — risk of inconsistency when scaling", "Manual steps that could be automated"], actions: ["Write a one-page SOP for your top 3 recurring tasks", "Identify one task to automate this quarter"] },
    { id: "finance", label: "Financial Health", phase: "internal", score: 60, summary: "Revenue streams are established but pricing and cash visibility need work.", strengths: ["Established revenue model", "Repeat business present"], gaps: ["Pricing not benchmarked against market", "Limited cash-flow forecasting"], actions: ["Compare your pricing to 3 direct competitors", "Build a simple 3-month cash flow forecast"] },
    { id: "team", label: "Team & Culture", phase: "internal", score: 63, summary: "Team strengths are clear but skill gaps could limit future growth.", strengths: ["Committed, reliable team", "Strong domain expertise"], gaps: ["Missing key skills for scale", "No formal onboarding process"], actions: ["Map your top skill gap and make a hire or training plan", "Create a one-page onboarding checklist"] },
    { id: "products", label: "Products & Services", phase: "internal", score: 67, summary: "Core offering is differentiated but customer feedback reveals improvement areas.", strengths: ["Clear, differentiated offering", "Customers see real value"], gaps: ["Feedback loop is informal", "Upsell opportunities not developed"], actions: ["Survey your top 10 customers for structured feedback", "Define one new offering to pilot next quarter"] },
    { id: "market", label: "Market & Competition", phase: "external", score: 61, summary: "Competitive landscape is understood but differentiation messaging needs sharpening.", strengths: ["Awareness of key competitors", "Niche positioning exists"], gaps: ["Differentiation not communicated clearly", "Trends not actively monitored"], actions: ["Sharpen one differentiating message across all channels", "Set up a monthly competitor review"] },
    { id: "customers", label: "Customers & Audience", phase: "external", score: 68, summary: "Ideal customer is clear and referrals are working; acquisition needs more structure.", strengths: ["Well-defined ideal customer", "Word-of-mouth referrals"], gaps: ["Acquisition channels are limited", "No formal retention tracking"], actions: ["Launch a simple referral incentive program", "Set up a monthly repeat-customer check-in"] },
    { id: "brand", label: "Brand & Presence", phase: "external", score: 64, summary: "Brand identity is recognized locally but online visibility and review volume lag.", strengths: ["Recognizable local brand", "Consistent voice"], gaps: ["Low online review count", "Inconsistent social cadence"], actions: ["Ask your next 20 happy customers for a Google review", "Commit to posting 3x/week on your main social channel"] },
    { id: "growth", label: "Growth & Partnerships", phase: "external", score: 65, summary: "Growth vision is present but execution pathways and partnerships need structure.", strengths: ["Clear growth goal", "Openness to partnerships"], gaps: ["No formal partnership pipeline", "Growth barrier not actively addressed"], actions: ["Reach out to one complementary local business this month", "Break your annual growth goal into monthly milestones"] },
  ],
  priorityActions: [
    { priority: "high", action: "Document your top 3 core operational processes as simple SOPs", category: "Operations", impact: "Enables delegation and creates consistent customer experience at scale" },
    { priority: "high", action: "Review and validate your pricing against 3 direct competitors", category: "Financial Health", impact: "Quickly identifies if you're undercharging or missing margin" },
    { priority: "high", action: "Ask your next 20 satisfied customers to leave a Google review", category: "Brand & Presence", impact: "Directly improves local search ranking and new customer trust" },
    { priority: "medium", action: "Identify your #1 team skill gap and create a hire or training plan", category: "Team & Culture", impact: "Removes a key bottleneck blocking your growth goal" },
    { priority: "medium", action: "Survey your best 10 customers for structured product/service feedback", category: "Products & Services", impact: "Reveals what to double down on and what to stop doing" },
    { priority: "medium", action: "Reach out to one complementary local business about a cross-promotion", category: "Growth & Partnerships", impact: "Low-cost customer acquisition with warm audiences" },
    { priority: "low", action: "Build a simple 3-month cash flow forecast", category: "Financial Health", impact: "Reduces financial surprises and improves decision-making" },
    { priority: "low", action: "Set up a monthly competitor monitoring process (even 30 min/month)", category: "Market & Competition", impact: "Keeps your positioning sharp and flags threats early" },
  ],
};

export async function generateComprehensiveBusinessAuditAI(
  auditData: Record<string, string>,
): Promise<ComprehensiveAuditResult> {
  if (!isClaudeConfigured()) return FALLBACK_AUDIT;

  const auditText = Object.entries(auditData)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const result = await claudeJSON<ComprehensiveAuditResult>({
    system: `You are a senior business strategy consultant. Analyze this business owner's self-assessment and produce a comprehensive internal + external business audit. Score each of the 8 sections honestly (0-100). Be specific, direct, and actionable. Reference the owner's actual words in your findings. Identify real risks and real strengths, not generic advice.`,
    user: `Business owner audit responses:\n\n${auditText}\n\nReturn JSON:\n{\n  "overallScore": number,\n  "internalScore": number,\n  "externalScore": number,\n  "executiveSummary": "3-4 sentence summary referencing specifics from their answers",\n  "sections": [\n    {\n      "id": "operations|finance|team|products|market|customers|brand|growth",\n      "label": "Operations|Financial Health|Team & Culture|Products & Services|Market & Competition|Customers & Audience|Brand & Presence|Growth & Partnerships",\n      "phase": "internal|external",\n      "score": number,\n      "summary": "1-2 sentences tied to their specific answers",\n      "strengths": ["2-3 specific strengths from their responses"],\n      "gaps": ["2-3 specific gaps or risks identified"],\n      "actions": ["2-3 concrete next steps specific to their situation"]\n    }\n  ],\n  "priorityActions": [\n    { "priority": "high|medium|low", "action": "specific action", "category": "section label", "impact": "why this matters for this specific business" }\n  ]\n}\n\nInclude all 8 sections in order: operations, finance, team, products (internal), then market, customers, brand, growth (external). Provide 6-8 priority actions ordered high to low.`,
    maxTokens: 3500,
    temperature: 0.3,
  });

  return result ?? FALLBACK_AUDIT;
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
