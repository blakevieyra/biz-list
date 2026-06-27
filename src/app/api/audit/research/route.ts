import { NextResponse } from "next/server";
import { getClaudeModel, isClaudeConfigured } from "@/lib/ai/claude-client";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { businessName, category, cityState, website } = body ?? {};

  if (!businessName || !category) {
    return NextResponse.json({ error: "businessName and category are required." }, { status: 400 });
  }

  if (!isClaudeConfigured()) {
    return NextResponse.json({ error: "AI not configured." }, { status: 503 });
  }

  const apiKey = process.env.CLAUDE_API_KEY!.trim();
  const location = cityState || "local area";
  const websiteLine = website ? `\nWebsite: ${website}` : "";

  const prompt = `You are a business research analyst. Research the following business online and return a comprehensive audit pre-fill based on what you find. Search for this business's reviews, competitors, online presence, industry trends, and any other publicly available information.

Business to research:
- Name: ${businessName}
- Industry/Category: ${category}
- Location: ${location}${websiteLine}

Search the web thoroughly for:
1. Online reviews (Google, Yelp, Facebook) — ratings, volume, common praise and complaints
2. Local competitors in the ${category} space near ${location}
3. Their online channels (website, social media, Google Business Profile)
4. Industry trends currently affecting ${category} businesses
5. Typical customer profile for this type of business
6. Any news, mentions, or notable information about this specific business

Return ONLY a valid JSON object with these exact keys (use empty string "" if you cannot find information for a field):

{
  "brandReviews": "Summary of online review presence — star ratings, volume, platform (Google/Yelp/Facebook), common themes in positive and negative reviews",
  "brandChannels": "Online channels this business uses — website URL, Instagram, Facebook, Google Business, any others found",
  "brandPercep": "How this business appears at first glance online — professional impression, brand tone, visual identity",
  "mktCompetitors": "2-3 real local competitors in ${location} doing similar work in ${category} — name them and note their differentiators",
  "mktTrend": "Most impactful current trend in the ${category} industry based on your research — be specific",
  "mktOpportunity": "Market gap or opportunity in ${location} for a ${category} business based on your research",
  "custTarget": "Typical customer profile for a ${category} business in ${location} — who they are, what they care about, how they buy",
  "custAcquisition": "Primary ways customers find ${category} businesses like this — based on industry norms and any specific findings",
  "custPain": "Core customer frustration or need that ${category} businesses in ${location} typically solve",
  "growthPartner": "Complementary local businesses or organizations in ${location} that would make natural partners for a ${category} business"
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
        max_tokens: 3000,
        temperature: 0.2,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 8,
          },
        ],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("Claude research error:", errBody);
      return NextResponse.json({ error: "Research failed. Please fill in the fields manually." }, { status: 502 });
    }

    const data = await res.json() as {
      content: Array<{ type: string; text?: string }>;
    };

    // Extract the text response (last text block)
    const textBlock = data.content?.filter((b) => b.type === "text").pop();
    const raw = textBlock?.text ?? "";

    // Parse JSON from the response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "Could not parse research results." }, { status: 500 });
    }

    const researched = JSON.parse(match[0]) as Record<string, string>;
    return NextResponse.json({ values: researched });
  } catch (e) {
    console.error("Audit research error:", e);
    return NextResponse.json({ error: "Research failed. Please fill in the fields manually." }, { status: 500 });
  }
}
