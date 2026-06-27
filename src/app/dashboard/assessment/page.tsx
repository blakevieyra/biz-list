import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessById } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import AuditClient from "./audit-client";

export default async function DashboardAssessmentPage() {
  const userId = await getAuthUserId();
  const initialValues: Record<string, string> = {};

  if (userId) {
    const supabase = await createClient();
    if (supabase) {
      const { data: row } = await supabase
        .from("businesses")
        .select("id, name, category, city, state, description, tagline, website, phone, hours")
        .eq("owner_id", userId)
        .limit(1)
        .maybeSingle();

      if (row) {
        const business = await getBusinessById(row.id);
        const name = business?.name ?? row.name;
        const category = business?.category ?? row.category;
        const city = business?.city ?? row.city ?? "";
        const state = business?.state ?? row.state ?? "";
        const description = business?.description ?? row.description ?? "";
        const tagline = business?.tagline ?? row.tagline ?? "";
        const website = business?.website ?? row.website ?? "";

        if (name) initialValues.businessName = name;
        if (category) initialValues.category = category;
        if (city || state) initialValues.cityState = [city, state].filter(Boolean).join(", ");
        if (description || tagline) initialValues.description = description || tagline;
        if (website) {
          initialValues.brandChannels = `Website: ${website}`;
        }
      }
    }
  }

  return <AuditClient initialValues={initialValues} />;
}
