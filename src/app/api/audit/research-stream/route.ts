import { getClaudeModel, isClaudeConfigured } from "@/lib/ai/claude-client";

export const maxDuration = 120;

type StepResult = { finding: string } & Record<string, string>;

async function searchStep(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<StepResult> {
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
        model,
        max_tokens: 700,
        temperature: 0.1,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return { finding: "Search unavailable" };

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const textBlock = data.content?.filter((b) => b.type === "text").pop();
    const raw = (textBlock?.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return { finding: raw.slice(0, 120) || "No data found" };

    const parsed = JSON.parse(raw.slice(start, end + 1)) as StepResult;
    return parsed;
  } catch {
    return { finding: "Could not retrieve data" };
  }
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
  const model = getClaudeModel();
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
      const r0 = await searchStep(apiKey, model,
        `Find all online channels for "${businessName}" (${category} in ${location}). Search for their website, Google Business Profile, Instagram, Facebook, LinkedIn, Yelp, TikTok, YouTube. Return JSON only: {"finding":"1-sentence summary listing all channels found with actual URLs","brandChannels":"complete list of all URLs and platforms found"}`
      );
      Object.assign(research, r0);
      emit({ step: 0, status: "found", finding: r0.finding });

      // Step 1 — Reviews & reputation
      emit({ step: 1, status: "searching" });
      const r1 = await searchStep(apiKey, model,
        `Find online reviews and reputation for "${businessName}" in ${location}. Check Google, Yelp, Facebook, BBB. Return JSON only: {"finding":"1-sentence with actual star rating and review count","brandReviews":"full review summary with ratings, count, platform, and themes","brandPercep":"overall perception based on reviews and online presence"}`
      );
      Object.assign(research, r1);
      emit({ step: 1, status: "found", finding: r1.finding });

      // Step 2 — Local competitors
      emit({ step: 2, status: "searching" });
      const r2 = await searchStep(apiKey, model,
        `Find 2-3 real named competitors to "${businessName}" (${category} business) in ${location}. Return JSON only: {"finding":"1-sentence naming the actual competitors found","mktCompetitors":"named competitor list with their differentiators and weaknesses"}`
      );
      Object.assign(research, r2);
      emit({ step: 2, status: "found", finding: r2.finding });

      // Step 3 — Industry trends, customers, opportunities
      emit({ step: 3, status: "searching" });
      const r3 = await searchStep(apiKey, model,
        `Research ${category} industry in ${location} for 2025. Find: current trends, market opportunities, typical customer profile, acquisition channels, customer pain points, complementary local businesses for partnership. Return JSON only: {"finding":"1-sentence key trend","mktTrend":"most impactful 2025 trend","mktOpportunity":"specific local opportunity","custTarget":"customer profile","custAcquisition":"how customers find these businesses","custPain":"core pain point","growthPartner":"complementary local businesses"}`
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
