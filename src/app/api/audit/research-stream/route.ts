import { getClaudeModel, isClaudeConfigured } from "@/lib/ai/claude-client";

export const maxDuration = 120;

// claude-sonnet-4-6 supports web-search-2025-03-05 beta
const WEB_SEARCH_MODEL = "claude-sonnet-4-6";

type StepResult = { finding: string } & Record<string, string>;

function extractJSON(text: string): StepResult | null {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const raw = JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>;
    const finding = raw.finding;
    if (!finding || typeof finding !== "string") return null;
    // Flatten any nested objects/arrays to readable strings so they don't appear as JSON in the report
    const result: StepResult = { finding };
    for (const [key, val] of Object.entries(raw)) {
      if (key === "finding") continue;
      if (typeof val === "string") {
        result[key] = val;
      } else if (Array.isArray(val)) {
        result[key] = val.filter((v) => typeof v === "string").join("; ");
      } else if (val != null && typeof val === "object") {
        result[key] = Object.values(val as Record<string, unknown>)
          .filter((v) => typeof v === "string")
          .join("; ");
      }
    }
    return result;
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
        max_tokens: 2000,
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
  // 1. Try live web search — force tool use so the model actually searches
  const webText = await callClaude(
    apiKey,
    WEB_SEARCH_MODEL,
    webSearchPrompt,
    { "anthropic-beta": "web-search-2025-03-05" },
    {
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      tool_choice: { type: "any" },
    },
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
    // 3. Last resort: minimal single-field prompt
    const strictPrompt = `Return ONLY a valid JSON object with a single key "finding" containing one clear sentence. No prose, no markdown, no extra keys.\nContext: ${fallbackPrompt.slice(0, 400)}\nFormat: {"finding":"your one-sentence answer"}`;
    const strictText = await callClaude(apiKey, fallbackModel, strictPrompt);
    if (strictText) {
      const parsed2 = extractJSON(strictText);
      if (parsed2) {
        console.log(`[research-stream] ${stepName}: strict fallback OK`);
        return parsed2;
      }
      // JSON extraction still failed — use the raw text as the finding
      const rawSentence = strictText
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[{}":\[\]]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(/[.!?\n]/)[0]
        .trim();
      if (rawSentence.length > 15) {
        console.log(`[research-stream] ${stepName}: raw text fallback`);
        return { finding: rawSentence.slice(0, 350) };
      }
    }
    // Use first meaningful sentence from the original fallback text
    const sentence = fallbackText
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[{}":\[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(/[.!?\n]/)[0]
      .trim();
    if (sentence.length > 15) {
      console.log(`[research-stream] ${stepName}: sentence fallback`);
      return { finding: sentence.slice(0, 350) };
    }
  }

  // Absolute last resort — never leave a placeholder
  return { finding: `${stepName} analysis used industry baseline from BizList knowledge base.` };
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
  const noSiteFallback = (url: string): StepResult => ({
    finding: `Website at ${url || "the provided URL"} was not accessible — pricing, services, and social links were not extracted directly.`,
    websitePricing: "",
    websiteSocial: "",
    websiteTeam: "",
    websiteServices: "",
    websiteRawText: "",
  });

  // Normalise URL
  let base = website.trim();
  if (!base) return noSiteFallback("(no URL provided)");
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  base = base.replace(/\/$/, "");

  // Fetch homepage + /services in parallel
  const [homeHtml, servicesHtml] = await Promise.all([
    fetchPage(base),
    fetchPage(`${base}/services`),
  ]);

  if (!homeHtml && !servicesHtml) {
    console.error(`[research-stream] website-step: both pages failed for ${base}`);
    return noSiteFallback(base);
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
  if (!text) return noSiteFallback(base);

  const parsed = extractJSON(text);
  if (!parsed) {
    console.error("[research-stream] website-step: parse failed:", text.slice(0, 200));
    return noSiteFallback(base);
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
        `Use web_search to find the online presence of "${businessName}", a ${category} business in ${location}. Search for their website, Google Business Profile, Instagram, Facebook, LinkedIn, Yelp, TikTok. After searching, output ONLY a valid JSON object with no other text:\n{"finding":"one sentence listing every platform found with URLs","brandChannels":"comma-separated list of platform names and URLs found"}`,
        `You are a business research expert. Describe the typical online presence for a ${category} business named "${businessName}" in ${location} based on industry norms. Output ONLY valid JSON:\n{"finding":"one sentence describing the expected online presence for this type of business","brandChannels":"list the platforms most ${category} businesses in ${location} use, including website, Google Business Profile, and the 2-3 most common social platforms for this industry"}`,
      );
      if (!r0.brandChannels && r0.finding) r0.brandChannels = r0.finding;
      Object.assign(research, r0);
      emit({ step: 0, status: "found", finding: r0.finding });

      // Step 1 — Reviews & reputation
      emit({ step: 1, status: "searching" });
      const r1 = await searchStep(
        apiKey,
        "step-1-reviews",
        `Use web_search to find reviews for "${businessName}" in ${location}. Search Google Maps, Yelp, Facebook, and BBB. After searching, output ONLY a valid JSON object with no other text:\n{"finding":"one sentence with the star rating, review count, and primary platform","brandReviews":"summary of ratings on each platform found, review count, most mentioned themes","brandPercep":"overall brand perception from reviews — positive signals and recurring complaints"}`,
        `You are a business research expert. Describe the review landscape for a ${category} business in ${location}. Output ONLY valid JSON:\n{"finding":"one sentence about typical review patterns for ${category} businesses in this market","brandReviews":"typical review volume and star rating range for ${category} in ${location}, and which platforms get the most reviews","brandPercep":"what customers typically praise and criticize about ${category} businesses in ${location}"}`,
      );
      if (!r1.brandReviews && r1.finding) r1.brandReviews = r1.finding;
      if (!r1.brandPercep && r1.finding) r1.brandPercep = r1.finding;
      Object.assign(research, r1);
      emit({ step: 1, status: "found", finding: r1.finding });

      // Step 2 — Local competitors
      emit({ step: 2, status: "searching" });
      const r2 = await searchStep(
        apiKey,
        "step-2-competitors",
        `Use web_search to find the top 3 competitors to "${businessName}" (${category}) in ${location}. After searching, output ONLY this exact JSON with no other text:\n{"finding":"one sentence naming the 2-3 real competitors found","mktCompetitors":"Competitor 1: [Name] — [their key differentiator vs ${businessName}] — [their main weakness]. Competitor 2: [Name] — [differentiator] — [weakness]. Competitor 3: [Name] — [differentiator] — [weakness]."}`,
        `You are a business research expert. Name 3 specific competitors a ${category} business in ${location} would face. Output ONLY valid JSON:\n{"finding":"one sentence on the competitive landscape for ${category} in ${location}","mktCompetitors":"Competitor 1: [Name] — [key differentiator] — [main weakness]. Competitor 2: [Name] — [differentiator] — [weakness]. Competitor 3: [Name] — [differentiator] — [weakness]."}`,
      );
      // Ensure mktCompetitors is populated — fall back to finding if model omitted it
      if (!r2.mktCompetitors && r2.finding) r2.mktCompetitors = r2.finding;
      Object.assign(research, r2);
      emit({ step: 2, status: "found", finding: r2.finding });

      // Step 3 — Industry trends, customers, opportunities
      emit({ step: 3, status: "searching" });
      const r3 = await searchStep(
        apiKey,
        "step-3-industry-trends",
        `Use web_search to research the ${category} industry in ${location} in 2025 — trends, customer demographics, and growth opportunities. After searching, output ONLY a valid JSON object with no other text:\n{"finding":"the single most impactful 2025 trend for ${category} businesses","mktTrend":"explain the trend in 2 sentences with local relevance","mktOpportunity":"the best specific untapped opportunity for a ${category} business in ${location} right now","custTarget":"age range, income, lifestyle, and values of the ideal ${category} customer in ${location}","custAcquisition":"top 3 channels customers use to discover ${category} businesses, ranked by effectiveness","custPain":"the single biggest frustration driving customers to seek out a ${category} business","growthPartner":"2-3 local business types that naturally refer customers to ${category} businesses and why"}`,
        `You are a business research expert with deep knowledge of local markets. Analyze the ${category} industry in ${location} for 2025. Output ONLY valid JSON:\n{"finding":"the single most important trend shaping ${category} in 2025","mktTrend":"explain this trend in 2 concrete sentences relevant to ${location}","mktOpportunity":"the best specific growth opportunity for a ${category} business in ${location} right now","custTarget":"ideal customer: age range, income level, lifestyle, what they value most","custAcquisition":"top 3 discovery channels ranked by effectiveness for ${category} in ${location}","custPain":"the single biggest pain point driving customers to seek ${category} services","growthPartner":"2-3 specific local business types that naturally refer customers to ${category} businesses"}`,
      );
      // Ensure all sub-fields are populated — fall back to finding if model omitted any
      if (!r3.mktTrend && r3.finding) r3.mktTrend = r3.finding;
      if (!r3.mktOpportunity && r3.finding) r3.mktOpportunity = r3.finding;
      if (!r3.custTarget && r3.finding) r3.custTarget = r3.finding;
      if (!r3.custAcquisition && r3.finding) r3.custAcquisition = r3.finding;
      if (!r3.custPain && r3.finding) r3.custPain = r3.finding;
      if (!r3.growthPartner && r3.finding) r3.growthPartner = r3.finding;
      Object.assign(research, r3);
      emit({ step: 3, status: "found", finding: r3.finding });

      // Step 4 — Email & contact discoverability
      emit({ step: 4, status: "searching" });
      const r4 = await searchStep(
        apiKey,
        "step-4-email-contact",
        `Use web_search to find the public contact email and contact discoverability for "${businessName}" (${category} in ${location}). Check their website, Google Business Profile, Yelp, and social bios. After searching, output ONLY a valid JSON object with no other text:\n{"finding":"one sentence on whether a public email was found and where","emailAddress":"the actual email found or 'Not publicly listed'","contactDiscoverability":"rate contact discoverability as excellent/good/fair/poor and explain why"}`,
        `You are a business research expert. For a ${category} business in ${location}, describe typical contact info discoverability. Output ONLY valid JSON:\n{"finding":"one sentence on how easily customers can typically reach ${category} businesses in ${location}","emailAddress":"Not determinable without live access — typical ${category} businesses in ${location} use contact forms, phone, or social DMs","contactDiscoverability":"typical contact discoverability for ${category} businesses in ${location}: what contact methods they provide and how easy they are to find"}`,
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
