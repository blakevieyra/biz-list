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
  const hasDescription = (auditData.description?.length ?? 0) > 60;
  const hasServices = Boolean(auditData.services?.trim());
  const hasReviews = Boolean(auditData.onlineReviews?.trim());
  const hasCompetitors = Boolean(auditData.competitors?.trim());
  const hasChannels = Boolean(auditData.onlineChannels?.trim());

  const brandScore = (hasWebsite ? 20 : 0) + (hasChannels ? 20 : 0) + (hasReviews ? 25 : 0) + 20;
  const productScore = (hasServices ? 30 : 0) + (hasDescription ? 25 : 0) + 30;
  const marketScore = (hasCompetitors ? 30 : 0) + 40;
  const activityScore = hasChannels ? 50 : 30;

  const internalSections = [58, 60, 63, productScore, 45, 40];
  const externalSections = [marketScore, 65, brandScore, 65, activityScore];
  const internalScore = Math.round(internalSections.reduce((a, b) => a + b, 0) / internalSections.length);
  const externalScore = Math.round(externalSections.reduce((a, b) => a + b, 0) / externalSections.length);
  const overallScore = Math.round([...internalSections, ...externalSections].reduce((a, b) => a + b, 0) / 11);

  return {
    overallScore,
    internalScore,
    externalScore,
    executiveSummary: `${name} operates in the ${category} space in ${location}. ${hasWebsite ? "A web presence was detected." : "No website was found — this is a critical gap for discovery."} ${hasReviews ? "Online reviews were found and analyzed." : "No online reviews were found, limiting trust signals."} This audit covers 11 dimensions: internal operations, financial health, team, products, legal compliance, ownership credibility, market position, customer reach, brand presence, growth, and digital activity. Each section below includes an action plan with score-improvement projections.`,
    sections: [
      {
        id: "operations", label: "Operations & Processes", phase: "internal", score: 58,
        summary: `${name}'s operational profile shows a ${category} business in ${location} — service delivery exists but process documentation evidence is limited.`,
        strengths: [`Operating as a ${category} business in ${location} implies established service delivery.`, hasServices ? `Service offerings are defined: ${auditData.services.slice(0, 80)}.` : "Core service exists."],
        gaps: ["No operational documentation or SOP evidence found in public-facing materials.", "Scaling risk: without documented processes, quality and speed depend entirely on key individuals."],
        actions: [`Document the top 3 recurring tasks for ${name} as one-page SOPs (+12 pts on next audit).`, "Identify one manual step per service that can be automated — scheduling, invoicing, or follow-up (+8 pts on next audit)."],
      },
      {
        id: "finance", label: "Financial Health", phase: "internal", score: 60,
        summary: `Revenue model for ${name} is active but pricing visibility and market benchmarking are not evident from public data.`,
        strengths: [hasServices ? `Defined service menu supports structured pricing: ${auditData.services.slice(0, 80)}.` : "Active business operations indicate revenue generation.", `Operating in ${location} ${category} market which shows demand.`],
        gaps: [hasCompetitors ? `Competitor pricing found (${auditData.competitors.slice(0, 100)}) — no evidence ${name} has benchmarked against these.` : "No competitor pricing benchmarking evidence found.", "No public pricing page or rate card — prospective customers cannot self-qualify."],
        actions: [hasCompetitors ? `Compare ${name}'s pricing against competitors: ${auditData.competitors.slice(0, 80)} (+15 pts on next audit).` : `Research 3 competitor prices in ${location} for ${category} services and update yours accordingly (+15 pts).`, "Publish a clear pricing page or starting-price range on your website and BizList profile (+10 pts on next audit)."],
      },
      {
        id: "team", label: "Team & Culture", phase: "internal", score: 63,
        summary: `${name} operates in ${category} in ${location} — team structure is not publicly documented but domain expertise is implied by active operations.`,
        strengths: [`Active ${category} operation in ${location} implies functional team or owner expertise.`, auditData.isHiring === "Yes" ? "Currently hiring — signals growth intent and team investment." : "Stable team structure based on operational continuity."],
        gaps: [auditData.isHiring === "Yes" ? "Open hiring position creates skill gap risk until filled." : "No visible team credentials or expertise signals online.", "No onboarding, training, or culture documentation found publicly."],
        actions: [auditData.isHiring === "Yes" ? "Prioritize filling the open role — write a specific job description naming the skill gap it resolves (+10 pts)." : "Publish team credentials or owner bio to build trust (+15 pts on next audit).", "Create a one-page onboarding doc for any new hire or contractor (+8 pts on next audit)."],
      },
      {
        id: "products", label: "Products & Services", phase: "internal", score: productScore,
        summary: hasServices ? `${name} offers ${auditData.services.slice(0, 120)} — the offering is defined but competitive differentiation signals need strengthening.` : `${name}'s specific offerings are not prominently listed, creating a discovery gap for potential customers.`,
        strengths: [hasServices ? `Concrete services offered: ${auditData.services.slice(0, 100)}.` : `Active ${category} business implies service delivery capacity.`, hasDescription ? `Business description provided: "${auditData.description.slice(0, 80)}…"` : "Business is operational and serving customers."],
        gaps: [hasServices ? "No customer testimonials or case studies found to validate service quality." : "Service list is not publicly defined — prospects cannot self-qualify.", "Upsell or bundled service packaging not evident."],
        actions: [hasServices ? `Collect 3 customer testimonials for your top service: ${auditData.services.slice(0, 80)} and publish them (+15 pts).` : "Publish a clear, priced service menu to your BizList profile and website (+20 pts on next audit).", "Define one bundle or add-on that increases average transaction value (+10 pts on next audit)."],
      },
      {
        id: "legal", label: "Legal & Compliance", phase: "internal", score: 45,
        summary: `${name}'s compliance posture for ${category} in ${location} — core licensing is assumed operational but digital documentation and public-facing credibility signals are limited.`,
        strengths: [`Active ${category} operations in ${location} imply basic regulatory compliance is in place.`, hasWebsite ? "Website presence provides a surface to display permits and certifications." : "Physical presence implies local licensing."],
        gaps: [`No health permit, business license, or industry certification found in publicly visible ${category} materials.`, "No BBB registration or industry association membership visible — missing key trust signals for new customers."],
        actions: [`Post your business license and applicable ${category} permits to your website's About or Contact page (+15 pts on next audit).`, "Register with the Better Business Bureau (BBB) — free to list, and directly increases customer trust (+12 pts on next audit)."],
      },
      {
        id: "credentials", label: "Ownership & Credibility", phase: "internal", score: 40,
        summary: `${name} ownership and professional background are not prominently featured — a critical gap for building trust with new customers discovering the business in ${location}.`,
        strengths: [`Active ${category} operations imply hands-on expertise and owner commitment.`, hasServices ? `Defined service menu (${auditData.services.slice(0, 60)}) demonstrates operational knowledge.` : "Business is actively serving customers, implying established expertise."],
        gaps: ["No owner bio, professional credentials, or About page found publicly — new customers cannot vet who they're doing business with.", "No certifications, awards, industry training, or professional affiliations visible."],
        actions: [`Add an 'About' page or owner story to your website and BizList profile — describe your background, training, and what makes ${name} different (+18 pts on next audit).`, "List any certifications, awards, years of experience, or professional affiliations prominently across all channels (+12 pts on next audit)."],
      },
      {
        id: "market", label: "Market & Competition", phase: "external", score: marketScore,
        summary: hasCompetitors ? `Research identified competitors in the ${location} ${category} market: ${auditData.competitors.slice(0, 120)}. Differentiation clarity is the key gap.` : `The ${category} market in ${location} is active — specific competitor data was not surfaced during research.`,
        strengths: [hasCompetitors ? `Named competitors found: ${auditData.competitors.slice(0, 120)}.` : `Established ${category} market in ${location} with real customer demand.`, auditData.mktTrend ? `Industry trend identified: ${auditData.mktTrend.slice(0, 100)}.` : "Active market conditions support growth."],
        gaps: [hasCompetitors ? `Competitors are visible online — no evidence ${name} has a defined differentiation strategy against them.` : "No competitor monitoring process evident.", auditData.mktTrend ? `Trend "${auditData.mktTrend.slice(0, 60)}" may be shifting customer expectations — no visible response strategy.` : "Industry trends not being actively monitored or responded to."],
        actions: [hasCompetitors ? `Pick your single strongest advantage over ${auditData.competitors.slice(0, 60)} and make it the headline on your website (+12 pts).` : `Research 3 active competitors in ${location} for ${category} and map their pricing and positioning (+15 pts).`, "Set a monthly 30-minute competitor review to track changes in pricing and messaging (+8 pts on next audit)."],
      },
      {
        id: "customers", label: "Customers & Audience", phase: "external", score: 65,
        summary: auditData.custTarget ? `Target customer profile: ${auditData.custTarget.slice(0, 120)}. Acquisition channels and retention need more structure.` : `${category} in ${location} has a clearly addressable local audience — acquisition and retention systems need documentation.`,
        strengths: [auditData.custTarget ? `Identified customer base: ${auditData.custTarget.slice(0, 100)}.` : `${category} businesses in ${location} benefit from strong local word-of-mouth and community networks.`, auditData.custAcquisition ? `Known acquisition channels: ${auditData.custAcquisition.slice(0, 80)}.` : "Local discovery via Google Maps and Yelp are high-intent channels for this category."],
        gaps: ["No formal customer retention or repeat-purchase system in evidence (loyalty program, email list, follow-up sequence).", auditData.custPain ? `Core customer pain point (${auditData.custPain.slice(0, 80)}) is not explicitly messaged on public-facing materials.` : "Customer pain points and buying motivators are not prominently communicated."],
        actions: [auditData.custAcquisition ? `Double down on your top acquisition channel: ${auditData.custAcquisition.slice(0, 80)} — invest 80% of marketing effort here first (+15 pts).` : `Claim and optimize your Google Business Profile — this is the #1 discovery channel for ${category} businesses (+20 pts).`, "Launch a simple post-purchase follow-up (text or email) within 48 hours of each transaction to drive repeat business and reviews (+12 pts)."],
      },
      {
        id: "brand", label: "Brand & Presence", phase: "external", score: brandScore,
        summary: hasChannels ? `${name} has online presence on: ${auditData.onlineChannels.slice(0, 120)}. ${hasReviews ? `Review presence found: ${auditData.onlineReviews.slice(0, 80)}.` : "Review volume is a gap."}` : `${name} has limited discoverable online presence — no channels were found during research.`,
        strengths: [hasChannels ? `Online channels found: ${auditData.onlineChannels.slice(0, 120)}.` : `${name} is listed on BizList — local directory presence is established.`, hasReviews ? `Review presence: ${auditData.onlineReviews.slice(0, 100)}.` : "Business is operational and has served customers who can provide reviews."],
        gaps: [!hasChannels ? "No website, social profiles, or Google Business presence found during research — severe discovery handicap." : hasReviews ? "Review volume or recency may lag behind competitors." : "No online reviews found — trust signals are absent for new prospects.", auditData.brandPercep ? `First impression: "${auditData.brandPercep.slice(0, 100)}" — consistency and professionalism need reinforcement.` : "No consistent brand voice or visual identity found publicly."],
        actions: [!hasWebsite ? "Launch a basic website — even a one-page site with contact info is critical (+25 pts on next audit)." : hasChannels ? `Ensure all channels (${auditData.onlineChannels.slice(0, 60)}) are updated and consistent — same logo, hours, and contact info (+10 pts).` : "Claim and complete your Google Business Profile — it's free and directly impacts local search (+20 pts).", hasReviews ? "Respond publicly to all existing reviews within 48 hours (+8 pts)." : `Ask your next 10 customers directly for a Google review — personal requests convert at 30–40% (+18 pts).`],
      },
      {
        id: "growth", label: "Growth & Partnerships", phase: "external", score: 65,
        summary: auditData.growthPartner ? `Partnership opportunities identified in ${location}: ${auditData.growthPartner.slice(0, 120)}.` : `${name} is positioned for growth in the ${category} market in ${location} — partnership pipeline needs development.`,
        strengths: [auditData.mktOpportunity ? `Market opportunity identified: ${auditData.mktOpportunity.slice(0, 100)}.` : `${category} in ${location} has clear growth potential via local partnerships and community presence.`, auditData.growthPartner ? `Complementary partners available: ${auditData.growthPartner.slice(0, 100)}.` : "Local business ecosystem provides cross-referral opportunities."],
        gaps: ["No formal partnership pipeline or co-marketing activity found.", "Growth targets, if set, are not broken into monthly milestones with named owners — execution risk."],
        actions: [auditData.growthPartner ? `Reach out to one of these businesses this week: ${auditData.growthPartner.slice(0, 80)} — propose a mutual referral arrangement (+15 pts).` : `Identify one complementary ${category} business in ${location} and propose a cross-referral or co-promotion (+15 pts).`, auditData.mktOpportunity ? `Act on this specific opportunity now: ${auditData.mktOpportunity.slice(0, 80)} (+12 pts).` : "Break your 12-month revenue goal into 4 quarterly milestones with a specific owner for each (+8 pts)."],
      },
      {
        id: "activity", label: "Digital Activity", phase: "external", score: activityScore,
        summary: hasChannels ? `${name} has a presence on ${auditData.onlineChannels.slice(0, 80)} but posting frequency, review response rate, and content freshness are not fully verified.` : `${name} shows limited measurable digital activity — no regular content rhythm detected across public channels.`,
        strengths: [hasChannels ? `Active channels found: ${auditData.onlineChannels.slice(0, 80)}.` : `${category} businesses in ${location} benefit from highly visual social content opportunities.`, hasReviews ? `Existing reviews provide engagement opportunity: ${auditData.onlineReviews.slice(0, 60)}.` : "BizList presence creates a starting point for content activity."],
        gaps: ["No verified regular posting schedule — infrequent content causes algorithm suppression on Google and Instagram.", "Review response cadence unknown — unanswered reviews signal poor customer service to future prospects."],
        actions: [`Commit to posting at least once per week on your most active channel — ${hasChannels ? auditData.onlineChannels.slice(0, 40) : "Google Business Profile or Instagram"} — even simple product photos count (+20 pts on next audit).`, "Respond to all reviews within 48 hours — Google's algorithm boosts businesses that engage with their review profile (+15 pts on next audit)."],
      },
    ],
    priorityActions: [
      { priority: "high", action: hasChannels ? `Update all discovered channels (${auditData.onlineChannels?.slice(0, 60) ?? "online profiles"}) with current hours, services, and contact info.` : `Claim your Google Business Profile and create a presence on the top 2 social platforms for ${category} businesses.`, category: "Brand & Presence", impact: "Directly drives local search discovery and new customer trust." },
      { priority: "high", action: hasReviews ? "Respond to all existing reviews within 48 hours and ask every customer this week for a new Google review." : `Ask your next 10 customers directly for a Google review — zero reviews is the single biggest trust barrier for ${category} businesses.`, category: "Brand & Presence", impact: "Review count and response rate are direct Google local ranking factors." },
      { priority: "high", action: `Add an 'About' or owner page to your website and BizList profile — describe your background, training, and what makes ${name} different.`, category: "Ownership & Credibility", impact: "Trust and credibility are the primary conversion factors for new customers." },
      { priority: "medium", action: hasServices ? `Document your service delivery process for ${auditData.services?.slice(0, 60) ?? "your top service"} as a one-page SOP.` : "Document your top 3 recurring delivery tasks as simple SOPs.", category: "Operations & Processes", impact: "Enables consistent quality, faster onboarding, and safe delegation." },
      { priority: "medium", action: auditData.growthPartner ? `Initiate a partnership conversation with: ${auditData.growthPartner?.slice(0, 60)} — propose a mutual referral arrangement.` : `Identify one complementary ${category} business in ${location} and propose a cross-referral or co-promotion.`, category: "Growth & Partnerships", impact: "Warm referral partnerships are the most cost-effective growth channel for local businesses." },
      { priority: "low", action: `Post your business license and applicable ${category} permits to your website — then register with the Better Business Bureau.`, category: "Legal & Compliance", impact: "Compliance visibility converts skeptical prospects and reduces customer service friction." },
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

  const system = `You are a senior business strategy consultant producing a deep, evidence-based audit across 11 dimensions. Your output is read by the business owner — every sentence must be specific to their business, not generic advice.

MANDATORY RULES:
1. NEVER write generic content. Every finding cites something from the profile or research data.
2. WEBSITE DATA IS GROUND TRUTH: If "WEBSITE PRICING (verified from live website)" has content, quote those exact prices. If social links are in "WEBSITE SOCIAL LINKS", list each by name.
3. Every strength names something concrete: a specific service, URL, price, competitor, or customer type.
4. Every gap explains WHY it matters for THIS business in THIS category and location.
5. Every action is immediately executable AND ends with "(+X pts on next audit)" to show score improvement.
6. Score floors: websitePricing found → Financial ≥55; websiteSocial found → Brand ≥50; websiteServices found → Products ≥50.
7. Executive summary names real findings: actual prices, actual social channels, actual competitors, actual review ratings.
8. FORBIDDEN: "your team", "your customers", "clear service delivery", "consistent voice", "committed team", "no pricing found" (if pricing was found).
9. Be HONEST — do not inflate scores. A business with no reviews should score 25–35 on Brand, not 65.

SCORING RUBRICS:
- Operations: SOPs/processes evident +20, online booking +15, hiring active +10, defined workflows +20. Base: 35.
- Financial Health: Pricing on website +30, tiers defined +20, competitor pricing benchmarked +10. Base: 25. Min 55 if websitePricing present.
- Team & Culture: Team/owner page +20, credentials listed +20, hiring activity +15, reviews mention staff +15. Base: 20.
- Products & Services: Prices listed +30, description >100 chars +20, 3+ services +15, clear value prop +15. Base: 25. Min 50 if websiteServices present.
- Legal & Compliance: Business license visible online +20, industry permit/cert visible +20, BBB listed +15, no public complaints +20. Base: 25.
- Ownership & Credibility: Owner bio/about page +25, certifications +20, awards +15, years in business stated +15. Base: 15.
- Market & Competition: Named competitors +25, industry trend +20, clear niche +15, market opportunity +15. Base: 25.
- Customers & Audience: Customer profile identified +20, acquisition channels +20, reviews cite customer type +20, pain point stated +15. Base: 25.
- Brand & Presence: Website +20, 2+ verified social channels +25, reviews >5 +20, consistent branding +15. Base: 15. Min 50 if websiteSocial present.
- Growth & Partnerships: Partner targets +25, market opportunity +20, hiring signals growth +15, trend alignment +15. Base: 25.
- Digital Activity: Posts weekly on 1+ platform +25, responds to reviews within 48h +20, content in last 30 days +15, profiles current +10. Base: 20.`;

  const user = `BUSINESS PROFILE:
${profileSummary}

${(hasResearch || hasWebsiteData) ? `RESEARCH & WEBSITE EVIDENCE ("WEBSITE ... verified from live website" fields are ground truth — read directly from the live site):
${researchSummary}` : "NOTE: No web research or website data gathered — audit based on profile data and what its absence implies."}

CRITICAL INSTRUCTIONS:
- WEBSITE PRICING present → Financial score ≥55, quote exact prices.
- WEBSITE SOCIAL LINKS present → Brand score ≥50, list each channel by name.
- WEBSITE SERVICES present → Products score ≥50, cite those services.
- For Legal & Compliance: check if a business license, health permit, food safety cert, or BBB listing was found in research. If not found, score 25–45 and tell the owner exactly what to get.
- For Ownership & Credibility: check if an owner bio, 'About' page, or credentials were found. If not, score 20–40 and give specific steps.
- For Digital Activity: check posting frequency from channels found. No evidence = score 20–35; active posting = 55–75.
- Every action ends with "(+X pts on next audit)" — be specific and realistic about the score gain.
- Keep each field concise — total response must fit in 5000 tokens.

Return ONLY this JSON (no markdown, no commentary):
{
  "overallScore": <average of all 11 section scores>,
  "internalScore": <average of operations, finance, team, products, legal, credentials>,
  "externalScore": <average of market, customers, brand, growth, activity>,
  "executiveSummary": "<3-4 sentences: quote actual prices if found, name real social channels, cite specific competitors, state actual review count/rating, name the top 2 gaps>",
  "sections": [
    {
      "id": "operations",
      "label": "Operations & Processes",
      "phase": "internal",
      "score": <0-100 per rubric>,
      "summary": "<one specific sentence citing evidence>",
      "strengths": ["<specific strength with evidence>", "<second>"],
      "gaps": ["<specific gap + business consequence>", "<second>"],
      "actions": ["<executable action> (+X pts on next audit)", "<second action> (+X pts on next audit)"]
    },
    {"id":"finance","label":"Financial Health","phase":"internal","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"team","label":"Team & Culture","phase":"internal","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"products","label":"Products & Services","phase":"internal","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"legal","label":"Legal & Compliance","phase":"internal","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"credentials","label":"Ownership & Credibility","phase":"internal","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"market","label":"Market & Competition","phase":"external","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"customers","label":"Customers & Audience","phase":"external","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"brand","label":"Brand & Presence","phase":"external","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"growth","label":"Growth & Partnerships","phase":"external","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]},
    {"id":"activity","label":"Digital Activity","phase":"external","score":0,"summary":"","strengths":[],"gaps":[],"actions":[]}
  ],
  "priorityActions": [
    {"priority":"high","action":"<specific action + exact gap it closes> (+X pts on next audit)","category":"<section label>","impact":"<measurable outcome>"},
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
    maxTokens: 5000,
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
      console.error("[audit] Incomplete sections in response, got:", parsed.sections?.length);
      return profileFallback;
    }
    // Back-fill any missing new sections with fallback data so old audits still render
    const sectionIds = new Set(parsed.sections.map((s) => s.id));
    for (const fs of profileFallback.sections) {
      if (!sectionIds.has(fs.id)) parsed.sections.push(fs);
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
