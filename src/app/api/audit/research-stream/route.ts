import { getClaudeModel, isClaudeConfigured } from "@/lib/ai/claude-client";

export const maxDuration = 120;

// Web search beta only works on claude-3-5-sonnet-20241022
const WEB_SEARCH_MODEL = "claude-3-5-sonnet-20241022";

type StepResult = { finding: string } & Record<string, string>;

function extractJSON(text: string): StepResult | null {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1)) as StepResult;
    if (parsed.finding) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function callClaude(
  apiKey: string,
  model: string,
  prompt: string,
  extraHeaders?: Record<string, string>,
  extraBody?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
        ...extraBody,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      console.error(`[research-stream] Claude ${model} error ${res.status}:`, errBody?.error?.message ?? errBody);
      return null;
    }

    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    const textBlock = data.content?.filter((b) => b.type === "text").pop();
    const text = textBlock?.text?.trim() ?? "";
    if (!text) {
      console.error(`[research-stream] ${model} returned empty text`);
      return null;
    }
    return text;
  } catch (e) {
    console.error(`[research-stream] ${model} fetch threw:`, e);
    return null;
  }
}

async function searchStep(
  apiKey: string,
  stepName: string,
  webSearchPrompt: string,
  fallbackPrompt: string,
): Promise<StepResult> {
  // 1. Try live web search on claude-3-5-sonnet-20241022
  const webText = await callClaude(
    apiKey,
    WEB_SEARCH_MODEL,
    webSearchPrompt,
    { "anthropic-beta": "web-search-2025-03-05" },
    { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }] },
  );
  if (webText) {
    const parsed = extractJSON(webText);
    if (parsed) {
      console.log(`[research-stream] ${stepName}: web search OK`);
      return parsed;
    }
    console.error(`[research-stream] ${stepName}: web search returned non-JSON:`, webText.slice(0, 200));
  }

  // 2. Fallback: knowledge-based research using the configured model
  const fallbackModel = getClaudeModel();
  console.log(`[research-stream] ${stepName}: falling back to ${fallbackModel}`);
  const fallbackText = await callClaude(apiKey, fallbackModel, fallbackPrompt);
  if (fallbackText) {
    const parsed = extractJSON(fallbackText);
    if (parsed) {
      console.log(`[research-stream] ${stepName}: fallback OK`);
      return parsed;
    }
    // 3. Last resort: strict JSON mode
    const strictPrompt = `You are a JSON API. Respond with ONLY a valid JSON object — no prose, no markdown fences, no explanation. The object must have a "finding" key. Prompt: ${fallbackPrompt}`;
    const strictText = await callClaude(apiKey, fallbackModel, strictPrompt);
    if (strictText) {
      const parsed2 = extractJSON(strictText);
      if (parsed2) {
        console.log(`[research-stream] ${stepName}: strict fallback OK`);
        return parsed2;
      }
    }
  }

  return { finding: "Research unavailable — report will use profile data only" };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BizList-Audit/1.0)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function websiteStep(
  apiKey: string,
  website: string,
): Promise<StepResult> {
  const fallback: StepResult = {
    finding: "Website could not be read — report will use profile data",
    websitePricing: "",
    websiteSocial: "",
    websiteTeam: "",
    websiteServices: "",
    websiteRawText: "",
  };

  // Normalise URL
  let base = website.trim();
  if (!base) return fallback;
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  base = base.replace(/\/$/, "");

  // Fetch homepage + /services in parallel
  const [homeHtml, servicesHtml] = await Promise.all([
    fetchPage(base),
    fetchPage(`${base}/services`),
  ]);

  if (!homeHtml && !servicesHtml) {
    console.error(`[research-stream] website-step: both pages failed for ${base}`);
    return fallback;
  }

  const homeText = homeHtml ? stripHtml(homeHtml).slice(0, 4000) : "";
  const servText = servicesHtml ? stripHtml(servicesHtml).slice(0, 4000) : "";
  const combined = [
    homeText ? `=== HOMEPAGE (${base}) ===\n${homeText}` : "",
    servText ? `=== SERVICES PAGE (${base}/services) ===\n${servText}` : "",
  ].filter(Boolean).join("\n\n").slice(0, 7000);

  const extractPrompt = `You are a data extractor. Read this website content and return a JSON object with ONLY what you find verbatim — do NOT invent anything.

JSON fields to fill (use empty string "" if not found):
{
  "finding": "one sentence: what pricing/services/social info was found",
  "websitePricing": "exact pricing tiers and amounts found on the page, e.g. 'Starter $99/mo, Pro $199/mo, Enterprise custom'",
  "websiteSocial": "all social media URLs or handles found: Instagram, LinkedIn, Facebook, Twitter/X, YouTube, TikTok",
  "websiteTeam": "team member names, roles, or owner info found",
  "websiteServices": "exact list of services with any descriptions found",
  "websiteRawText": "verbatim excerpt (under 300 chars) most useful for the audit"
}

Website content:
${combined}`;

  const fallbackModel = getClaudeModel();
  const text = await callClaude(apiKey, fallbackModel, extractPrompt);
  if (!text) return fallback;

  const parsed = extractJSON(text);
  if (!parsed) {
    console.error("[research-stream] website-step: parse failed:", text.slice(0, 200));
    return fallback;
  }

  return {
    finding: parsed.finding || `Website read at ${base}`,
    websitePricing: parsed.websitePricing ?? "",
    websiteSocial: parsed.websiteSocial ?? "",
    websiteTeam: parsed.websiteTeam ?? "",
    websiteServices: parsed.websiteServices ?? "",
    websiteRawText: parsed.websiteRawText ?? "",
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { businessName, category, cityState, website } = body ?? {};

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
        "step-0-online-presence",
        `Search for all online channels for "${businessName}", a ${category} business in ${location}. Find their official website URL, Google Business Profile, Instagram, Facebook, LinkedIn, Yelp, TikTok, and YouTube. Return JSON only: {"finding":"one sentence listing every channel found with URLs","brandChannels":"full comma-separated list of platform names and URLs"}`,
        `You are a business research assistant. For a ${category} business named "${businessName}" in ${location}, describe what their typical online presence looks like based on industry norms for this category and region. Return a JSON object: {"finding":"one sentence describing the expected online presence for this type of business","brandChannels":"list the platforms most ${category} businesses in ${location} use: website, Google Business Profile, and the 2-3 most common social platforms for this industry"}`,
      );
      Object.assign(research, r0);
      emit({ step: 0, status: "found", finding: r0.finding });

      // Step 1 — Reviews & reputation
      emit({ step: 1, status: "searching" });
      const r1 = await searchStep(
        apiKey,
        "step-1-reviews",
        `Search for online reviews and reputation for "${businessName}" in ${location}. Check Google Maps, Yelp, Facebook, and the Better Business Bureau. Return JSON only: {"finding":"one sentence with the star rating, review count, and primary platform","brandReviews":"detailed summary: ratings on each platform, review count, most mentioned themes, most recent reviews","brandPercep":"overall brand perception — positive signals, recurring complaints, and how customers describe the business"}`,
        `You are a business research assistant. For a ${category} business in ${location}, describe the typical review landscape for this industry. Return a JSON object: {"finding":"one sentence about typical review patterns for ${category} businesses in this market","brandReviews":"describe the typical review volume, star rating range (3.8–4.6 is common), and which platforms ${category} businesses get most reviews on in ${location}","brandPercep":"what customers typically praise and criticize about ${category} businesses in ${location} — be specific to the category"}`,
      );
      Object.assign(research, r1);
      emit({ step: 1, status: "found", finding: r1.finding });

      // Step 2 — Local competitors
      emit({ step: 2, status: "searching" });
      const r2 = await searchStep(
        apiKey,
        "step-2-competitors",
        `Search for the top 3 competitors to "${businessName}" (${category} business) in ${location}. Look for businesses in the same category within the same city. Return JSON only: {"finding":"one sentence naming the top 2-3 competitors found","mktCompetitors":"for each competitor: name, their key differentiator vs ${businessName}, and their main weakness or gap"}`,
        `You are a business research assistant. Name and describe 3 typical competitors that a ${category} business in ${location} would face. Include a mix of local independents and any regional/national players in this space. Return a JSON object: {"finding":"one sentence describing the competitive landscape for ${category} businesses in ${location}","mktCompetitors":"list 3 competitor archetypes with their typical differentiators and weaknesses — be specific to the ${category} industry in ${location}"}`,
      );
      Object.assign(research, r2);
      emit({ step: 2, status: "found", finding: r2.finding });

      // Step 3 — Industry trends, customers, opportunities
      emit({ step: 3, status: "searching" });
      const r3 = await searchStep(
        apiKey,
        "step-3-industry-trends",
        `Research the ${category} industry in ${location} in 2025. Find: the biggest trend affecting this industry, a specific local market opportunity, who the typical customer is, how customers find these businesses, their core pain point, and what local business types make good partners. Return JSON only: {"finding":"one sentence on the most impactful 2025 trend","mktTrend":"explain the trend in 2 sentences","mktOpportunity":"specific untapped opportunity for ${category} businesses in ${location}","custTarget":"demographic and behavioral profile of the ideal customer","custAcquisition":"top 3 channels customers use to discover ${category} businesses","custPain":"the core frustration driving customers to seek out ${category} businesses","growthPartner":"2-3 complementary local business types that refer customers to ${category} businesses"}`,
        `You are a business research assistant with deep knowledge of local business markets. Analyze the ${category} industry in ${location} for 2025. Return a JSON object: {"finding":"the single most important trend shaping the ${category} industry in 2025","mktTrend":"explain this trend in 2 sentences with specific relevance to ${location}","mktOpportunity":"the best specific growth opportunity for a ${category} business in ${location} right now — be concrete","custTarget":"describe the ideal customer for a ${category} business in ${location}: age range, income level, lifestyle, what they value","custAcquisition":"the top 3 ways customers discover and choose ${category} businesses — rank by effectiveness for ${location}","custPain":"the single biggest pain point that makes customers seek out a ${category} business","growthPartner":"name 2-3 specific types of local businesses that naturally refer customers to ${category} businesses and explain why"}`,
      );
      Object.assign(research, r3);
      emit({ step: 3, status: "found", finding: r3.finding });

      // Step 4 — Email & contact discoverability
      emit({ step: 4, status: "searching" });
      const r4 = await searchStep(
        apiKey,
        "step-4-email-contact",
        `Find the public contact email address for "${businessName}" (${category} business in ${location}). Check their website contact page, Google Business Profile, social media bios, Yelp listing, and any directory listings. Return JSON only: {"finding":"one sentence stating whether a public email was found and where","emailAddress":"the actual email address found, or 'Not publicly listed' if none","contactDiscoverability":"rate how easy it is for customers to find contact info: excellent/good/fair/poor — and explain why"}`,
        `You are a business research assistant. For a ${category} business in ${location}, describe typical contact information discoverability practices for this industry. Return a JSON object: {"finding":"one sentence about how easily customers can typically reach ${category} businesses in ${location}","emailAddress":"Not determinable without live web access — typical ${category} businesses use a contact form, phone number, or social DMs","contactDiscoverability":"Describe the typical contact discoverability for ${category} businesses in ${location}: what contact methods they usually provide (phone, email, form, DMs) and how discoverable they are"}`,
      );
      Object.assign(research, r4);
      emit({ step: 4, status: "found", finding: r4.finding });

      // Step 5 — Read the business website directly
      emit({ step: 5, status: "searching" });
      const r5 = await websiteStep(apiKey, website ?? "");
      Object.assign(research, r5);
      emit({ step: 5, status: "found", finding: r5.finding });

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
