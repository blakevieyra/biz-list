import { NextResponse } from "next/server";
import { isClaudeConfigured, getClaudeModel } from "@/lib/ai/claude-client";
import type { ComprehensiveAuditResult } from "@/lib/ai/ai-services";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { profile, research } = body ?? {};

  if (!profile?.businessName || !profile?.category) {
    return NextResponse.json({ error: "Profile data is required." }, { status: 400 });
  }

  if (!isClaudeConfigured()) {
    return NextResponse.json({ error: "AI not configured." }, { status: 503 });
  }

  const apiKey = process.env.CLAUDE_API_KEY!.trim();

  const serviceList = Array.isArray(profile.services)
    ? (profile.services as { name: string; price?: string }[])
        .map((s) => `${s.name}${s.price ? ` (${s.price})` : ""}`)
        .join(", ")
    : "";

  const profileBlock = [
    `Business: ${profile.businessName}`,
    `Category: ${profile.category}`,
    `Location: ${profile.cityState || "not listed"}`,
    profile.tagline ? `Tagline: ${profile.tagline}` : "",
    profile.description ? `Description: ${profile.description}` : "",
    serviceList ? `Services: ${serviceList}` : "",
    profile.phone ? `Phone: ${profile.phone}` : "",
    profile.hours ? `Hours: ${profile.hours}` : "",
    profile.website ? `Website: ${profile.website}` : "",
    profile.isHiring ? "Currently hiring: Yes" : "",
  ]
    .filter(Boolean)
    .join("\n");

  const researchBlock = research
    ? [
        research.brandChannels ? `Online presence & channels: ${research.brandChannels}` : "",
        research.brandReviews ? `Reviews & reputation: ${research.brandReviews}` : "",
        research.brandPercep ? `Brand perception: ${research.brandPercep}` : "",
        research.mktCompetitors ? `Local competitors: ${research.mktCompetitors}` : "",
        research.mktTrend ? `Industry trend: ${research.mktTrend}` : "",
        research.mktOpportunity ? `Market opportunity: ${research.mktOpportunity}` : "",
        research.custTarget ? `Customer profile: ${research.custTarget}` : "",
        research.custAcquisition ? `Customer acquisition: ${research.custAcquisition}` : "",
        research.custPain ? `Customer pain point: ${research.custPain}` : "",
        research.growthPartner ? `Partnership opportunities: ${research.growthPartner}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const prompt = `You are a senior business strategy consultant. Generate a thorough, specific, and honest business audit using the profile data and live web research findings below.

BUSINESS PROFILE:
${profileBlock}

WEB RESEARCH FINDINGS (gathered from live internet searches):
${researchBlock || "No web research available — base analysis on profile data and industry knowledge."}

AUDIT RULES:
- Reference the business by name throughout
- For external sections: use the web research findings directly — cite real competitors found, actual review themes, specific channels discovered
- For internal sections: infer from profile data and typical patterns for this business type/size
- Be honest about weaknesses — do not soften gaps
- Mention specific online channels found (website URL, Instagram, Facebook, Google Business, etc.) in the Brand section
- Action items must be concrete and achievable within 30-90 days
- Score each section honestly (0-100): 70+ = solid, 50-69 = needs work, below 50 = critical gap

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "overallScore": <0-100>,
  "internalScore": <0-100>,
  "externalScore": <0-100>,
  "executiveSummary": "<3-4 sentences with specific findings from the research — mention real competitors, actual review themes, discovered channels>",
  "sections": [
    {
      "id": "operations",
      "label": "Operations & Processes",
      "phase": "internal",
      "score": <0-100>,
      "summary": "<1-2 sentences specific to this business>",
      "strengths": ["<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete 30-90 day action>", "<concrete action>"]
    },
    {
      "id": "finance",
      "label": "Financial Health",
      "phase": "internal",
      "score": <0-100>,
      "summary": "<1-2 sentences>",
      "strengths": ["<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete>", "<concrete>"]
    },
    {
      "id": "team",
      "label": "Team & Culture",
      "phase": "internal",
      "score": <0-100>,
      "summary": "<1-2 sentences>",
      "strengths": ["<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete>", "<concrete>"]
    },
    {
      "id": "products",
      "label": "Products & Services",
      "phase": "internal",
      "score": <0-100>,
      "summary": "<1-2 sentences referencing actual services listed>",
      "strengths": ["<specific>", "<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete>", "<concrete>"]
    },
    {
      "id": "market",
      "label": "Market & Competition",
      "phase": "external",
      "score": <0-100>,
      "summary": "<1-2 sentences naming specific competitors found in research>",
      "strengths": ["<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete>", "<concrete>"]
    },
    {
      "id": "customers",
      "label": "Customers & Audience",
      "phase": "external",
      "score": <0-100>,
      "summary": "<1-2 sentences from customer research>",
      "strengths": ["<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete>", "<concrete>"]
    },
    {
      "id": "brand",
      "label": "Brand & Presence",
      "phase": "external",
      "score": <0-100>,
      "summary": "<1-2 sentences referencing actual channels and reviews found online>",
      "strengths": ["<list specific channels/platforms found, e.g. website URL, Instagram handle>", "<specific review theme found>"],
      "gaps": ["<specific gap in online presence>", "<specific review gap>"],
      "actions": ["<concrete>", "<concrete>"]
    },
    {
      "id": "growth",
      "label": "Growth & Partnerships",
      "phase": "external",
      "score": <0-100>,
      "summary": "<1-2 sentences>",
      "strengths": ["<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete>", "<concrete>"]
    }
  ],
  "priorityActions": [
    { "priority": "high", "action": "<specific action>", "category": "<section label>", "impact": "<why this matters for this specific business>" },
    { "priority": "high", "action": "<specific action>", "category": "<section label>", "impact": "<why>" },
    { "priority": "high", "action": "<specific action>", "category": "<section label>", "impact": "<why>" },
    { "priority": "medium", "action": "<specific action>", "category": "<section label>", "impact": "<why>" },
    { "priority": "medium", "action": "<specific action>", "category": "<section label>", "impact": "<why>" },
    { "priority": "low", "action": "<specific action>", "category": "<section label>", "impact": "<why>" }
  ]
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: getClaudeModel(),
        max_tokens: 4000,
        temperature: 0.2,
        system: "You are a senior business strategy consultant generating a structured JSON audit report. Return only valid JSON — no markdown, no commentary.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[audit/generate] Claude error:", errBody);
      return NextResponse.json({ error: "Report generation failed." }, { status: 502 });
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textBlock = data.content?.filter((b) => b.type === "text").pop();
    const raw = (textBlock?.text ?? "").trim();

    // Strip markdown fences if present
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Find outermost JSON object
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start === -1 || end === -1) {
      console.error("[audit/generate] No JSON found:", raw.slice(0, 300));
      return NextResponse.json({ error: "Could not parse audit results." }, { status: 500 });
    }

    const result = JSON.parse(stripped.slice(start, end + 1)) as ComprehensiveAuditResult;
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[audit/generate] Error:", e);
    return NextResponse.json({ error: "Report generation failed. Please try again." }, { status: 500 });
  }
}
