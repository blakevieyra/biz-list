import { isClaudeConfigured } from "@/lib/ai/claude-client";

export const maxDuration = 120;

// Web search beta works on Claude 3.5 — fall back to knowledge-based research if unavailable
const WEB_SEARCH_MODEL = "claude-3-5-sonnet-20241022";

type StepResult = { finding: string } & Record<string, string>;

async function searchStep(
  apiKey: string,
  webSearchPrompt: string,
  fallbackPrompt: string,
): Promise<StepResult> {
  // Try live web search first
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
        model: WEB_SEARCH_MODEL,
        max_tokens: 700,
        temperature: 0.1,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
        messages: [{ role: "user", content: webSearchPrompt }],
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
      const textBlock = data.content?.filter((b) => b.type === "text").pop();
      const raw = (textBlock?.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(raw.slice(start, end + 1)) as StepResult;
        if (parsed.finding) return parsed;
      }
    } else {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      console.error("[research-stream] web search failed:", res.status, errBody?.error?.message);
    }
  } catch (e) {
    console.error("[research-stream] web search error:", e);
  }

  // Fallback: use Claude's training knowledge (no web search tool)
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: WEB_SEARCH_MODEL,
        max_tokens: 600,
        temperature: 0.3,
        messages: [{ role: "user", content: fallbackPrompt }],
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
      const textBlock = data.content?.filter((b) => b.type === "text").pop();
      const raw = (textBlock?.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        return JSON.parse(raw.slice(start, end + 1)) as StepResult;
      }
    }
  } catch (e) {
    console.error("[research-stream] fallback error:", e);
  }

  return { finding: "Could not retrieve data" };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { businessName, category, cityState } = body ?? {};

  if (!businessName || !category) {
    return new Response("Missing businessName or category", { status: 400 });
  }

  if (!isClaudeConfigured()) {
    return new Response("AI not configured", { status: 503 });
  }

  const apiKey = process.env.CLAUDE_API_KEY!.trim();
  const location = cityState || "local area";
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: object) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const research: Record<string, string> = {};

      // Step 0 — Online presence & social profiles
      emit({ step: 0, status: "searching" });
      const r0 = await searchStep(
        apiKey,
        `Find all online channels for "${businessName}" (${category} in ${location}). Search for their website, Google Business Profile, Instagram, Facebook, LinkedIn, Yelp, TikTok, YouTube. Return JSON only: {"finding":"1-sentence summary listing all channels found with actual URLs","brandChannels":"complete list of all URLs and platforms found"}`,
        `Based on your knowledge, what online channels would a ${category} business named "${businessName}" in ${location} likely have? Return JSON only: {"finding":"1-sentence summary of likely online presence for this type of business","brandChannels":"typical online channels for a ${category} business: website, Google Business Profile, social media platforms common in this industry"}`,
      );
      Object.assign(research, r0);
      emit({ step: 0, status: "found", finding: r0.finding });

      // Step 1 — Reviews & reputation
      emit({ step: 1, status: "searching" });
      const r1 = await searchStep(
        apiKey,
        `Find online reviews and reputation for "${businessName}" in ${location}. Check Google, Yelp, Facebook, BBB. Return JSON only: {"finding":"1-sentence with actual star rating and review count","brandReviews":"full review summary with ratings, count, platform, and themes","brandPercep":"overall perception based on reviews and online presence"}`,
        `Based on your knowledge, what are typical review patterns and reputation signals for a ${category} business in ${location}? Return JSON only: {"finding":"1-sentence about typical review landscape for ${category} businesses","brandReviews":"typical review platforms and patterns for ${category} businesses — Google, Yelp, Facebook are the most common","brandPercep":"what customers typically say about ${category} businesses in ${location} — common praise and concerns"}`,
      );
      Object.assign(research, r1);
      emit({ step: 1, status: "found", finding: r1.finding });

      // Step 2 — Local competitors
      emit({ step: 2, status: "searching" });
      const r2 = await searchStep(
        apiKey,
        `Find 2-3 real named competitors to "${businessName}" (${category} business) in ${location}. Return JSON only: {"finding":"1-sentence naming the actual competitors found","mktCompetitors":"named competitor list with their differentiators and weaknesses"}`,
        `Based on your knowledge, what types of competitors does a ${category} business in ${location} typically face? Return JSON only: {"finding":"1-sentence about the competitive landscape for ${category} in ${location}","mktCompetitors":"typical competitors in the ${category} space — national chains, regional players, and local independents — with their key differentiators and common weaknesses"}`,
      );
      Object.assign(research, r2);
      emit({ step: 2, status: "found", finding: r2.finding });

      // Step 3 — Industry trends, customers, opportunities
      emit({ step: 3, status: "searching" });
      const r3 = await searchStep(
        apiKey,
        `Research ${category} industry in ${location} for 2025. Find: current trends, market opportunities, typical customer profile, acquisition channels, customer pain points, complementary local businesses for partnership. Return JSON only: {"finding":"1-sentence key trend","mktTrend":"most impactful 2025 trend","mktOpportunity":"specific local opportunity","custTarget":"customer profile","custAcquisition":"how customers find these businesses","custPain":"core pain point","growthPartner":"complementary local businesses"}`,
        `Based on your knowledge, analyze the ${category} industry in ${location} for 2025. Return JSON only: {"finding":"most impactful trend currently affecting ${category} businesses","mktTrend":"key 2025 trend in the ${category} industry — technology, consumer behavior, or market shift","mktOpportunity":"specific market gap or growth opportunity for ${category} businesses in ${location}","custTarget":"typical customer profile for a ${category} business — demographics, motivations, and buying behavior","custAcquisition":"primary channels customers use to find ${category} businesses — search, referrals, social, etc.","custPain":"core problem or frustration that drives customers to ${category} businesses","growthPartner":"complementary local business types that partner well with ${category} businesses"}`,
      );
      Object.assign(research, r3);
      emit({ step: 3, status: "found", finding: r3.finding });

      emit({ done: true, research });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
