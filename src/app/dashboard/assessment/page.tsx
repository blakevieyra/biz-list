import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessById } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import AuditClient, { type AuditProfileData } from "./audit-client";

export default async function DashboardAssessmentPage() {
  const userId = await getAuthUserId();

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
    }
  }

  return <AuditClient profile={profile} />;
}
