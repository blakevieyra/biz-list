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

function buildProfileFallback(auditData: Record<string, string>): ComprehensiveAuditResult {
  const name = auditData.businessName || "This business";
  const category = auditData.category || "this industry";
  const location = auditData.location || "your area";
  const hasWebsite = Boolean(auditData.website?.trim());
  const hasPhone = Boolean(auditData.phone?.trim());
  const hasDescription = (auditData.description?.length ?? 0) > 60;
  const hasServices = Boolean(auditData.services?.trim());
  const hasReviews = Boolean(auditData.onlineReviews?.trim());
  const hasCompetitors = Boolean(auditData.competitors?.trim());
  const hasChannels = Boolean(auditData.onlineChannels?.trim());

  const brandScore = (hasWebsite ? 20 : 0) + (hasChannels ? 20 : 0) + (hasReviews ? 25 : 0) + 20;
  const productScore = (hasServices ? 30 : 0) + (hasDescription ? 25 : 0) + 30;
  const marketScore = (hasCompetitors ? 30 : 0) + 40;

  return {
    overallScore: Math.round((brandScore + productScore + marketScore + 60) / 4),
    internalScore: Math.round((productScore + 60) / 2),
    externalScore: Math.round((brandScore + marketScore) / 2),
    executiveSummary: `${name} operates in the ${category} space in ${location}. ${hasWebsite ? "A web presence was detected." : "No website was found — this is a critical gap for discovery."} ${hasReviews ? "Online reviews were found and analyzed." : "No online reviews were found, limiting trust signals."} This audit highlights the highest-leverage improvements available based on your current profile and market data.`,
    sections: [
      {
        id: "operations", label: "Operations & Processes", phase: "internal", score: 58,
        summary: `${name}'s operational profile shows a ${category} business in ${location} — service delivery exists but process documentation evidence is limited.`,
        strengths: [`Operating as a ${category} business in ${location} implies established service delivery.`, hasServices ? `Service offerings are defined: ${auditData.services.slice(0, 80)}.` : "Core service exists."],
        gaps: ["No operational documentation or SOP evidence found in public-facing materials.", "Scaling risk: without documented processes, quality and speed depend entirely on key individuals."],
        actions: [`Document the top 3 recurring tasks for ${name} as one-page SOPs.`, "Identify one manual step per service that can be automated (scheduling, invoicing, or follow-up)."],
      },
      {
        id: "finance", label: "Financial Health", phase: "internal", score: 60,
        summary: `Revenue model for ${name} is active but pricing visibility and market benchmarking are not evident from public data.`,
        strengths: [hasServices ? `Defined service menu supports structured pricing: ${auditData.services.slice(0, 80)}.` : "Active business operations indicate revenue generation.", `Operating in ${location} ${category} market which shows demand.`],
        gaps: [hasCompetitors ? `Competitor pricing found (${auditData.competitors.slice(0, 100)}) — no evidence ${name} has benchmarked against these.` : "No competitor pricing benchmarking evidence found.", "No cash flow forecasting or financial projections evident."],
        actions: [hasCompetitors ? `Compare ${name}'s pricing directly against identified competitors: ${auditData.competitors.slice(0, 80)}.` : `Research 3 competitor prices in ${location} for ${category} services.`, "Build a 3-month rolling cash flow forecast to reduce decision lag."],
      },
      {
        id: "team", label: "Team & Culture", phase: "internal", score: 63,
        summary: `${name} operates in ${category} in ${location} — team structure is not publicly documented but domain expertise is implied by active operations.`,
        strengths: [`Active ${category} operation in ${location} implies functional team or owner expertise.`, auditData.isHiring === "Yes" ? `Currently hiring — signals growth intent and team investment.` : "Stable team structure based on operational continuity."],
        gaps: [auditData.isHiring === "Yes" ? "Open hiring position creates skill gap risk until filled." : "No visible team credentials or expertise signals online.", "No onboarding, training, or culture documentation found publicly."],
        actions: [auditData.isHiring === "Yes" ? "Prioritize filling the open role — identify the specific skill gap it resolves." : "Publish team credentials or owner bio to build trust and differentiate.", "Create a one-page onboarding doc for any new hire or contractor."],
      },
      {
        id: "products", label: "Products & Services", phase: "internal", score: productScore,
        summary: hasServices ? `${name} offers ${auditData.services.slice(0, 120)} — the offering is defined but competitive differentiation signals need strengthening.` : `${name}'s specific offerings are not prominently listed, creating a discovery gap for potential customers.`,
        strengths: [hasServices ? `Concrete services offered: ${auditData.services.slice(0, 100)}.` : `Active ${category} business implies service delivery capacity.`, hasDescription ? `Business description provided: "${auditData.description.slice(0, 80)}…"` : "Business is operational and serving customers."],
        gaps: [hasServices ? "No customer feedback mechanism or testimonial evidence found to validate service quality." : "Service list is not publicly defined — prospects cannot self-qualify.", "Upsell or bundled service packaging not evident."],
        actions: [hasServices ? `Collect structured feedback on each service: ${auditData.services.slice(0, 80)}.` : "Publish a clear, priced service menu to your BizList profile and website.", "Define one cross-sell or bundle opportunity to introduce next quarter."],
      },
      {
        id: "market", label: "Market & Competition", phase: "external", score: marketScore,
        summary: hasCompetitors ? `Research identified competitors in the ${location} ${category} market: ${auditData.competitors.slice(0, 120)}. Differentiation clarity is the key gap.` : `The ${category} market in ${location} is active — specific competitor data was not surfaced during research.`,
        strengths: [hasCompetitors ? `Named competitors found: ${auditData.competitors.slice(0, 120)}.` : `Established ${category} market in ${location} with real demand.`, auditData.mktTrend ? `Industry trend identified: ${auditData.mktTrend.slice(0, 100)}.` : "Active market conditions support growth."],
        gaps: [hasCompetitors ? `Competitors are visible online — no evidence ${name} has a defined response to their positioning.` : "No competitor monitoring process evident.", auditData.mktTrend ? `Trend "${auditData.mktTrend.slice(0, 60)}" may be shifting customer expectations — no response strategy found.` : "Industry trends not being actively monitored or responded to."],
        actions: [hasCompetitors ? `Identify one advantage over ${auditData.competitors.slice(0, 60)} and make it the primary message on your website and profile.` : `Research 3 active competitors in ${location} for ${category} and map their pricing and positioning.`, "Set a monthly 30-minute competitor review to track changes."],
      },
      {
        id: "customers", label: "Customers & Audience", phase: "external", score: 65,
        summary: auditData.custTarget ? `Target customer profile: ${auditData.custTarget.slice(0, 120)}. Acquisition channels and retention need more structure.` : `Typical ${category} customer in ${location}: ${auditData.custPain ? auditData.custPain.slice(0, 100) : "not yet defined from research"}.`,
        strengths: [auditData.custTarget ? `Identified customer base: ${auditData.custTarget.slice(0, 100)}.` : `${category} in ${location} has a clearly addressable local audience.`, auditData.custAcquisition ? `Known acquisition channels: ${auditData.custAcquisition.slice(0, 80)}.` : "Word-of-mouth and local discovery are active in this market."],
        gaps: ["No formal customer retention or repeat-purchase tracking evidence found.", auditData.custPain ? `Core customer pain point identified (${auditData.custPain.slice(0, 80)}) — no evidence of systematic messaging around this.` : "Customer pain points and motivators not prominently communicated."],
        actions: [auditData.custAcquisition ? `Double down on your top acquisition channel: ${auditData.custAcquisition.slice(0, 80)}.` : "Define your #1 customer acquisition channel and invest in it this quarter.", "Launch a simple post-purchase follow-up (email or text) to drive repeat business."],
      },
      {
        id: "brand", label: "Brand & Presence", phase: "external", score: brandScore,
        summary: hasChannels ? `${name} has online presence on: ${auditData.onlineChannels.slice(0, 120)}. ${hasReviews ? `Review presence found: ${auditData.onlineReviews.slice(0, 80)}.` : "Review volume is a gap."}` : `${name} has limited discoverable online presence — no channels were found during research.`,
        strengths: [hasChannels ? `Online channels found: ${auditData.onlineChannels.slice(0, 120)}.` : `${name} is listed on BizList — local directory presence is established.`, hasReviews ? `Review presence: ${auditData.onlineReviews.slice(0, 100)}.` : "Business is operational and has served customers who can provide reviews."],
        gaps: [!hasChannels ? "No website, social profiles, or Google Business presence found during research — severe discovery handicap." : hasReviews ? "Review volume or recency may lag behind competitors." : "No online reviews found — trust signals are absent for new prospects.", auditData.brandPercep ? `First impression: "${auditData.brandPercep.slice(0, 100)}" — consistency and professionalism should be reinforced.` : "No consistent brand voice or visual identity found publicly."],
        actions: [!hasWebsite ? "Launch a basic website — even a one-page site with contact info is essential." : hasChannels ? `Ensure all channels (${auditData.onlineChannels.slice(0, 60)}) are updated and consistent.` : "Claim and complete your Google Business Profile immediately.", hasReviews ? "Respond publicly to all existing reviews to show engagement." : `Ask your next 10 customers for a Google review — a direct request converts at 30–40%.`],
      },
      {
        id: "growth", label: "Growth & Partnerships", phase: "external", score: 65,
        summary: auditData.growthPartner ? `Partnership opportunities identified in ${location}: ${auditData.growthPartner.slice(0, 120)}.` : `${name} is positioned for growth in the ${category} market in ${location} — partnership pipeline needs development.`,
        strengths: [auditData.mktOpportunity ? `Market opportunity identified: ${auditData.mktOpportunity.slice(0, 100)}.` : `${category} in ${location} has growth potential.`, auditData.growthPartner ? `Complementary partners available: ${auditData.growthPartner.slice(0, 100)}.` : "Local business network in area provides partnership opportunities."],
        gaps: ["No formal partnership pipeline or co-marketing activity found.", "Annual growth targets, if any, are not broken into monthly milestones — execution risk."],
        actions: [auditData.growthPartner ? `Reach out to one of these complementary businesses this week: ${auditData.growthPartner.slice(0, 80)}.` : `Identify one complementary ${category} business in ${location} and propose a cross-referral arrangement.`, auditData.mktOpportunity ? `Act on this opportunity: ${auditData.mktOpportunity.slice(0, 80)}.` : "Break your 12-month growth goal into 4 quarterly milestones with a named owner for each."],
      },
    ],
    priorityActions: [
      { priority: "high", action: hasChannels ? `Strengthen your online presence — update all discovered channels (${auditData.onlineChannels?.slice(0, 60) ?? "found during research"}) with current hours, services, and contact info.` : `Claim your Google Business Profile and create accounts on the top 2 social platforms for ${category} businesses.`, category: "Brand & Presence", impact: "Directly drives local search discovery and new customer trust." },
      { priority: "high", action: hasReviews ? `Respond to all existing reviews and actively request new ones from your next 20 customers.` : `Ask your next 10 customers for a Google review — zero reviews is the single biggest trust barrier.`, category: "Brand & Presence", impact: "Review count and rating are Google ranking factors for local search." },
      { priority: "high", action: hasCompetitors ? `Benchmark your pricing against ${auditData.competitors?.slice(0, 60) ?? "identified competitors"} and close any gap.` : `Research 3 competitors in ${location} for ${category} and price accordingly.`, category: "Financial Health", impact: "Pricing misalignment costs revenue immediately — easy to fix once identified." },
      { priority: "medium", action: hasServices ? `Document your service delivery process for: ${auditData.services?.slice(0, 60) ?? "your top service"} as a one-page SOP.` : "Document your top 3 recurring delivery tasks as simple SOPs.", category: "Operations", impact: "Enables consistent quality and delegation as you grow." },
      { priority: "medium", action: auditData.growthPartner ? `Initiate a partnership conversation with a business in your identified partner pool: ${auditData.growthPartner?.slice(0, 60)}.` : `Reach out to one complementary business in ${location} about a referral or co-promotion.`, category: "Growth & Partnerships", impact: "Warm referral partnerships are the most cost-effective growth channel for local businesses." },
      { priority: "low", action: "Build a 3-month cash flow forecast using last 90 days of revenue and expenses.", category: "Financial Health", impact: "Reduces financial surprises and gives you a decision framework for investments." },
    ],
  };
}

export async function generateComprehensiveBusinessAuditAI(
  auditData: Record<string, string>,
): Promise<ComprehensiveAuditResult> {
  const profileFallback = buildProfileFallback(auditData);
  if (!isClaudeConfigured()) return profileFallback;

  const hasResearch = ["onlineReviews", "competitors", "onlineChannels", "brandPercep", "mktTrend"]
    .some((k) => Boolean(auditData[k]?.trim()));

  const hasWebsiteData = ["websitePricing", "websiteSocial", "websiteTeam", "websiteServices"]
    .some((k) => Boolean(auditData[k]?.trim()));

  const researchSummary = (hasResearch || hasWebsiteData)
    ? Object.entries({
        // --- Verified from actual website ---
        "WEBSITE PRICING (verified from live website)": auditData.websitePricing,
        "WEBSITE SOCIAL LINKS (verified from live website)": auditData.websiteSocial,
        "WEBSITE TEAM INFO (verified from live website)": auditData.websiteTeam,
        "WEBSITE SERVICES (verified from live website)": auditData.websiteServices,
        "WEBSITE VERBATIM EXCERPT": auditData.websiteRawText,
        // --- Web search research ---
        "Online channels found (web search)": auditData.onlineChannels,
        "Reviews found (web search)": auditData.onlineReviews,
        "Brand perception (web search)": auditData.brandPercep,
        "Named competitors (web search)": auditData.competitors,
        "Industry trend": auditData.mktTrend,
        "Market opportunity": auditData.mktOpportunity,
        "Customer profile": auditData.custTarget,
        "Acquisition channels": auditData.custAcquisition,
        "Customer pain points": auditData.custPain,
        "Partnership targets": auditData.growthPartner,
        "Contact email found": auditData.contactEmail,
        "Contact discoverability": auditData.contactDiscoverability,
      })
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : "";

  const profileSummary = [
    `Business: ${auditData.businessName}`,
    `Category: ${auditData.category}`,
    `Location: ${auditData.location || "not specified"}`,
    auditData.description ? `Description: ${auditData.description}` : "",
    auditData.tagline ? `Tagline: ${auditData.tagline}` : "",
    auditData.services ? `Services/products listed: ${auditData.services}` : "Services: none listed",
    auditData.website ? `Website: ${auditData.website}` : "Website: not provided",
    auditData.phone ? `Phone: ${auditData.phone}` : "Phone: not listed",
    auditData.hours ? `Hours: ${auditData.hours}` : "Hours: not listed",
    `Hiring: ${auditData.isHiring}`,
  ].filter(Boolean).join("\n");

  const system = `You are a senior business strategy consultant producing a real, evidence-based business audit. Your output will be read directly by the business owner — it must be specific to them, not generic.

MANDATORY RULES:
1. NEVER write generic template content. Every finding must cite something specific from the profile or research data provided.
2. WEBSITE DATA IS GROUND TRUTH: If "WEBSITE PRICING (verified from live website)" is provided, use those exact prices — do NOT say "no pricing found". If social links are in "WEBSITE SOCIAL LINKS", list them by name — do NOT say "no social channels found".
3. Every strength must name something concrete (a specific service, a found URL, a real price, a named competitor, an identified customer segment).
4. Every gap must explain WHY it matters for THIS business in THIS market — not for a generic business.
5. Every action must be immediately executable AND include the score impact in parentheses, e.g. "(+15 pts on next audit)" — so the owner knows re-auditing will show improvement.
6. Scores must reflect the actual evidence: if website pricing IS found, Financial Health starts at 55+. If social links ARE verified, Brand starts at 50+.
7. The executive summary must name specific findings: actual prices found, actual social channels found, actual competitor names, actual review ratings.
8. FORBIDDEN phrases: "your team", "your customers", "clear service delivery", "consistent voice", "word-of-mouth referrals", "committed team", "strong domain expertise", "no pricing found" (if website data shows pricing).

SCORING RUBRICS (apply to the verified data, not absence of data):
- Operations (0–100): Evidence of process documentation +20, online booking/scheduling +15, active hiring +10, defined SOPs/workflows +20. Default base: 35.
- Financial Health (0–100): Transparent pricing on website +30, defined service tiers +20, competitive pricing found +10, payment methods clear +10. Default base: 25. IMPORTANT: If websitePricing has content, minimum score is 55.
- Team & Culture (0–100): Visible team page +20, credentials listed +15, active hiring +15, reviews mention staff +20. Default base: 25.
- Products & Services (0–100): Services listed with prices +30, description >100 chars +20, 3+ services +15, clear value prop in tagline +15. Default base: 25. If websiteServices has content, minimum score is 50.
- Market & Competition (0–100): Named competitors found +25, industry trend identified +20, clear niche +15, market opportunity identified +15. Default base: 25.
- Customers & Audience (0–100): Customer profile researchable +20, acquisition channels identified +20, reviews mention customer type +20, pain point clear +15. Default base: 25.
- Brand & Presence (0–100): Website found +20, 2+ verified social channels +25, Google reviews >5 +20, consistent branding +15. Default base: 15. If websiteSocial has links, minimum score is 50.
- Growth & Partnerships (0–100): Partner targets identified +25, market opportunity clear +20, hiring signals growth +15, trend positions them well +15. Default base: 25.`;

  const user = `BUSINESS PROFILE:
${profileSummary}

${(hasResearch || hasWebsiteData) ? `RESEARCH & WEBSITE EVIDENCE (treat "WEBSITE ... (verified from live website)" fields as ground truth — they were read directly from the live site):
${researchSummary}` : "NOTE: No web research or website data was gathered — base your audit on the profile data and what its absence implies."}

CRITICAL INSTRUCTIONS:
- If "WEBSITE PRICING" has content → Financial Health score MUST be ≥55, and you MUST quote the actual prices in that section.
- If "WEBSITE SOCIAL LINKS" has content → Brand score MUST be ≥50, and you MUST list each social channel by name.
- If "WEBSITE SERVICES" has content → Products & Services score MUST be ≥50, and you MUST cite those services.
- Every action item MUST end with a score-improvement note like "(+10–20 pts on next audit)" so the owner knows re-auditing will show progress.
- Actions must be specific, named steps — not generic advice. Include the exact URL, platform name, or person to contact where applicable.

Produce a complete audit JSON. Every field must be specific to ${auditData.businessName} — zero generic content allowed.

Return ONLY this JSON (no markdown, no commentary):
{
  "overallScore": <weighted average of all 8 section scores>,
  "internalScore": <average of operations, finance, team, products>,
  "externalScore": <average of market, customers, brand, growth>,
  "executiveSummary": "<3-4 sentences citing specific findings — quote actual prices if found, list actual social channels, name real competitors, state specific market opportunity>",
  "sections": [
    {
      "id": "operations",
      "label": "Operations & Processes",
      "phase": "internal",
      "score": <0-100 per rubric>,
      "summary": "<one sentence citing specific operational evidence found>",
      "strengths": ["<specific strength with evidence source>", "<second strength>"],
      "gaps": ["<specific gap with business-specific consequence>", "<second gap>"],
      "actions": ["<specific executable action> (+X–Y pts on next audit)", "<second action> (+X–Y pts on next audit)"]
    },
    {"id":"finance","label":"Financial Health","phase":"internal","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"team","label":"Team & Culture","phase":"internal","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"products","label":"Products & Services","phase":"internal","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"market","label":"Market & Competition","phase":"external","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"customers","label":"Customers & Audience","phase":"external","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"brand","label":"Brand & Presence","phase":"external","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"growth","label":"Growth & Partnerships","phase":"external","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]}
  ],
  "priorityActions": [
    {"priority":"high","action":"<specific action citing the exact gap it closes> (+X pts on next audit)","category":"<section label>","impact":"<concrete measurable result>"},
    {"priority":"high","action":"","category":"","impact":""},
    {"priority":"high","action":"","category":"","impact":""},
    {"priority":"medium","action":"","category":"","impact":""},
    {"priority":"medium","action":"","category":"","impact":""},
    {"priority":"low","action":"","category":"","impact":""}
  ]
}`;

  const text = await claudeComplete({
    system,
    user,
    maxTokens: 8000,
    temperature: 0.2,
  });

  if (!text) {
    console.error("[audit] Claude returned null");
    return profileFallback;
  }

  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      console.error("[audit] No JSON braces found in response:", text.slice(0, 200));
      return profileFallback;
    }
    const parsed = JSON.parse(text.slice(start, end + 1)) as ComprehensiveAuditResult;
    if (!Array.isArray(parsed.sections) || parsed.sections.length < 8) {
      console.error("[audit] Incomplete sections in response");
      return profileFallback;
    }
    return parsed;
  } catch (e) {
    console.error("[audit] JSON parse failed:", e, "\nRaw snippet:", text.slice(0, 400));
    return profileFallback;
  }
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
