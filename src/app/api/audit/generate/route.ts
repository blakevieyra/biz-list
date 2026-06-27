import { NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/ai/claude-client";
import { generateComprehensiveBusinessAuditAI } from "@/lib/ai/ai-services";

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

  const serviceList = Array.isArray(profile.services)
    ? (profile.services as { name: string; price?: string }[])
        .map((s) => `${s.name}${s.price ? ` (${s.price})` : ""}`)
        .join(", ")
    : "";

  // Merge profile + web research into the audit data shape that
  // generateComprehensiveBusinessAuditAI already knows how to handle
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
    // Web research findings (empty strings are filtered out inside the function)
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
  };

  try {
    const result = await generateComprehensiveBusinessAuditAI(auditData);
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[audit/generate] Error:", e);
    return NextResponse.json(
      { error: "Report generation failed. Please try again." },
      { status: 500 },
    );
  }
}
