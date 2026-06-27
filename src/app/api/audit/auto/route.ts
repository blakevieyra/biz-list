import { NextResponse } from "next/server";
import { isClaudeConfigured, getClaudeModel } from "@/lib/ai/claude-client";
import type { ComprehensiveAuditResult } from "@/lib/ai/ai-services";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const {
    businessName,
    category,
    cityState,
    description,
    tagline,
    website,
    phone,
    hours,
    isHiring,
    services,
  } = body ?? {};

  if (!businessName || !category) {
    return NextResponse.json({ error: "businessName and category are required." }, { status: 400 });
  }

  if (!isClaudeConfigured()) {
    return NextResponse.json({ error: "AI not configured." }, { status: 503 });
  }

  const apiKey = process.env.CLAUDE_API_KEY!.trim();
  const location = cityState || "local area";

  const serviceList = Array.isArray(services)
    ? (services as { name: string; price?: string }[])
        .map((s) => `${s.name}${s.price ? ` (${s.price})` : ""}`)
        .join(", ")
    : (services as string | undefined) || "";

  const profileBlock = [
    `Business name: ${businessName}`,
    `Industry/Category: ${category}`,
    `Location: ${location}`,
    tagline ? `Tagline: ${tagline}` : "",
    description ? `Description: ${description}` : "",
    serviceList ? `Services/Offerings: ${serviceList}` : "",
    phone ? `Phone: ${phone}` : "",
    hours ? `Hours: ${hours}` : "",
    website ? `Website: ${website}` : "",
    isHiring ? "Currently hiring: Yes" : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a senior business strategy consultant with access to real-time web search. Conduct a thorough, in-depth business audit for this local business.

BUSINESS PROFILE:
${profileBlock}

STEP 1 — RESEARCH (use web_search for each of these):
1. Search for "${businessName} ${location}" — find their website, Google Business, social media accounts
2. Search for "${businessName} reviews ${location}" — find customer ratings and review themes on Google, Yelp, or Facebook
3. Search for "${category} businesses ${location} competitors" — identify 2-3 real, named local competitors
4. Search for "${category} industry trends 2025" — identify the most relevant current market forces
5. Search for "${category} customer acquisition ${location}" — typical channels customers use to find these businesses

STEP 2 — AUDIT GENERATION:
Using your research findings AND the profile data, generate a thorough, honest, and specific audit. Follow these rules:
- Name real competitors you found in web searches
- Reference actual review patterns/scores found
- Cite specific industry trends from your research
- For internal sections (operations, finance, team, products): use the profile data + typical patterns for this business type/size
- For external sections (market, customers, brand, growth): use your web research findings directly
- Be honest about weaknesses — don't soften gaps
- Make every action item concrete, specific, and achievable within 30-90 days
- Reference the business by name throughout

Return ONLY a valid JSON object — no markdown, no explanation, just the JSON:
{
  "overallScore": <0-100>,
  "internalScore": <0-100>,
  "externalScore": <0-100>,
  "executiveSummary": "<3-4 sentences referencing specific findings from web research and profile data>",
  "sections": [
    {
      "id": "operations",
      "label": "Operations & Processes",
      "phase": "internal",
      "score": <0-100>,
      "summary": "<1-2 sentences specific to this business>",
      "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
      "gaps": ["<specific gap 1>", "<specific gap 2>", "<specific gap 3>"],
      "actions": ["<concrete action 1>", "<concrete action 2>", "<concrete action 3>"]
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
      "summary": "<1-2 sentences referencing their actual services>",
      "strengths": ["<specific>", "<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete>", "<concrete>"]
    },
    {
      "id": "market",
      "label": "Market & Competition",
      "phase": "external",
      "score": <0-100>,
      "summary": "<1-2 sentences naming real competitors found in research>",
      "strengths": ["<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete>", "<concrete>"]
    },
    {
      "id": "customers",
      "label": "Customers & Audience",
      "phase": "external",
      "score": <0-100>,
      "summary": "<1-2 sentences>",
      "strengths": ["<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
      "actions": ["<concrete>", "<concrete>"]
    },
    {
      "id": "brand",
      "label": "Brand & Presence",
      "phase": "external",
      "score": <0-100>,
      "summary": "<1-2 sentences referencing what you actually found online>",
      "strengths": ["<specific>", "<specific>"],
      "gaps": ["<specific>", "<specific>"],
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
        "anthropic-beta": "web-search-2025-03-05",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: getClaudeModel(),
        max_tokens: 5000,
        temperature: 0.2,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5,
          },
        ],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[audit/auto] Claude error:", errBody);
      return NextResponse.json({ error: "Audit generation failed. Please try again." }, { status: 502 });
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textBlock = data.content?.filter((b) => b.type === "text").pop();
    const raw = textBlock?.text ?? "";

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("[audit/auto] No JSON found in response:", raw.slice(0, 400));
      return NextResponse.json({ error: "Could not parse audit results." }, { status: 500 });
    }

    const result = JSON.parse(match[0]) as ComprehensiveAuditResult;
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[audit/auto] Error:", e);
    return NextResponse.json({ error: "Audit generation failed. Please try again." }, { status: 500 });
  }
}
