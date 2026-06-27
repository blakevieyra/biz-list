import { NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/ai/claude-client";
import { generateComprehensiveBusinessAuditAI } from "@/lib/ai/ai-services";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MONTHLY_LIMIT = 5;

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
    onlineChannels: research?.brandChannels || "",
    onlineReviews: research?.brandReviews || "",
    brandPerception: research?.brandPercep || "",
    competitors: research?.mktCompetitors || "",
    industryTrend: research?.mktTrend || "",
    marketOpportunity: research?.mktOpportunity || "",
    customerProfile: research?.custTarget || "",
    customerAcquisition: research?.custAcquisition || "",
    customerPainPoint: research?.custPain || "",
    partnershipOpportunities: research?.growthPartner || "",
    contactEmail: research?.emailAddress || "",
    contactDiscoverability: research?.contactDiscoverability || "",
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
