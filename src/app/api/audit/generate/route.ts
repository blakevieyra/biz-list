import { NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/ai/claude-client";
import { generateComprehensiveBusinessAuditAI } from "@/lib/ai/ai-services";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const MONTHLY_LIMIT = 5;

function toStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    return v
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          // Turn competitor/partner objects into readable text instead of [object Object]
          return Object.values(item as Record<string, unknown>)
            .filter((val) => typeof val === "string" && (val as string).trim())
            .join(" — ");
        }
        return String(item);
      })
      .filter(Boolean)
      .join("; ");
  }
  if (typeof v === "object") {
    // Extract readable string values instead of serializing as JSON
    const obj = v as Record<string, unknown>;
    const texts = Object.values(obj)
      .filter((val) => typeof val === "string" && (val as string).trim().length > 5)
      .map((val) => val as string);
    return texts.join("; ") || "";
  }
  return String(v);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { profile, research } = body ?? {};

  if (!profile?.businessName || !profile?.category) {
    return NextResponse.json({ error: "Profile data is required." }, { status: 400 });
  }

  if (!isClaudeConfigured()) {
    return NextResponse.json({ error: "AI not configured." }, { status: 503 });
  }

  // Auth + monthly cap check
  const supabase = await createClient();
  let userId: string | null = null;
  let auditsThisMonth = 0;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (userId) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("business_audits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString());

      auditsThisMonth = count ?? 0;

      if (auditsThisMonth >= MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: `You've used all ${MONTHLY_LIMIT} audits for this month. Your limit resets on the 1st.`,
            limitReached: true,
            auditsThisMonth,
            monthlyLimit: MONTHLY_LIMIT,
          },
          { status: 429 },
        );
      }
    }
  }

  const serviceList = Array.isArray(profile.services)
    ? (profile.services as { name: string; price?: string }[])
        .map((s) => `${s.name}${s.price ? ` (${s.price})` : ""}`)
        .join(", ")
    : "";

  const auditData: Record<string, string> = {
    businessName: profile.businessName,
    category: profile.category,
    location: profile.cityState || "",
    description: profile.description || "",
    tagline: profile.tagline || "",
    services: serviceList,
    website: profile.website || "",
    phone: profile.phone || "",
    hours: profile.hours || "",
    isHiring: profile.isHiring ? "Yes" : "No",
    onlineChannels: toStr(research?.brandChannels),
    onlineReviews: toStr(research?.brandReviews),
    brandPerception: toStr(research?.brandPercep),
    competitors: toStr(research?.mktCompetitors),
    industryTrend: toStr(research?.mktTrend),
    marketOpportunity: toStr(research?.mktOpportunity),
    customerProfile: toStr(research?.custTarget),
    customerAcquisition: toStr(research?.custAcquisition),
    customerPainPoint: toStr(research?.custPain),
    partnershipOpportunities: toStr(research?.growthPartner),
    contactEmail: toStr(research?.emailAddress),
    contactDiscoverability: toStr(research?.contactDiscoverability),
    websitePricing: toStr(research?.websitePricing),
    websiteSocial: toStr(research?.websiteSocial),
    websiteTeam: toStr(research?.websiteTeam),
    websiteServices: toStr(research?.websiteServices),
    websiteRawText: toStr(research?.websiteRawText),
  };

  try {
    const result = await generateComprehensiveBusinessAuditAI(auditData);

    // Save to DB after successful generation
    if (supabase && userId && result) {
      await supabase.from("business_audits").insert({
        user_id: userId,
        business_name: profile.businessName,
        result: result as unknown as Record<string, unknown>,
      });
      auditsThisMonth += 1;
    }

    return NextResponse.json({ result, auditsThisMonth, monthlyLimit: MONTHLY_LIMIT });
  } catch (e) {
    console.error("[audit/generate] Error:", e);
    return NextResponse.json(
      { error: "Report generation failed. Please try again." },
      { status: 500 },
    );
  }
}
