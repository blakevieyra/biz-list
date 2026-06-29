import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessById } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ComprehensiveAuditResult } from "@/lib/ai/ai-services";
import AuditClient, { type AuditProfileData, type PastAudit } from "./audit-client";

export default async function DashboardAssessmentPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile: AuditProfileData = {
    businessName: "",
    category: "",
    cityState: "",
    description: "",
    tagline: "",
    website: "",
    phone: "",
    hours: "",
    isHiring: false,
    services: [],
  };

  let pastAudits: PastAudit[] = [];
  let auditsThisMonth = 0;

  if (userId) {
    const supabase = await createClient();
    if (supabase) {
      const { data: row } = await supabase
        .from("businesses")
        .select("id, name, category, city, state, description, tagline, website, phone, hours, is_hiring")
        .eq("owner_id", userId)
        .limit(1)
        .maybeSingle();

      if (row) {
        const business = await getBusinessById(row.id);

        profile.businessName = business?.name ?? row.name ?? "";
        profile.category = business?.category ?? row.category ?? "";
        profile.cityState = [
          business?.city ?? row.city ?? "",
          business?.state ?? row.state ?? "",
        ]
          .filter(Boolean)
          .join(", ");
        profile.description =
          business?.description ?? row.description ?? business?.tagline ?? row.tagline ?? "";
        profile.tagline = business?.tagline ?? row.tagline ?? "";
        profile.website = business?.website ?? row.website ?? "";
        profile.phone = business?.phone ?? row.phone ?? "";
        profile.hours = business?.hours ?? row.hours ?? "";
        profile.isHiring = business?.isHiring ?? row.is_hiring ?? false;
        profile.services = (business?.services ?? []).map((s) => ({
          name: s.name,
          price: s.price ?? undefined,
        }));
      }

      // Load audit history
      const { data: auditRows } = await supabase
        .from("business_audits")
        .select("id, business_name, result, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      pastAudits = (auditRows ?? []).map((r) => ({
        id: r.id as string,
        businessName: r.business_name as string,
        overallScore: ((r.result as ComprehensiveAuditResult)?.overallScore) ?? 0,
        createdAt: r.created_at as string,
        result: r.result as ComprehensiveAuditResult,
      }));

      auditsThisMonth = pastAudits.filter(
        (a) => new Date(a.createdAt) >= startOfMonth,
      ).length;
    }
  }

  return (
    <AuditClient
      profile={profile}
      pastAudits={pastAudits}
      auditsThisMonth={auditsThisMonth}
    />
  );
}
