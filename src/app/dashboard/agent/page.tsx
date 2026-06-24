import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessById, getCurrentProfile } from "@/lib/data";
import { canAccess } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import VirtualAgentClient from "./virtual-agent-client";

export default async function VirtualAgentPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile || !canAccess(profile.planTier, "virtualAgent")) redirect("/pricing");

  const supabase = await createClient();
  let businessName = profile.displayName;
  let category = "local business";
  let services = "our services";

  if (supabase) {
    const { data: row } = await supabase
      .from("businesses")
      .select("id, name, category, services")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();

    if (row) {
      const business = await getBusinessById(row.id);
      if (business) {
        businessName = business.name;
        category = business.category;
        services = business.services.map((s) => s.name).join(", ") || services;
      }
    }
  }

  return (
    <VirtualAgentClient
      businessName={businessName}
      category={category}
      services={services}
    />
  );
}
