"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/actions/auth";

export async function trackPageView(businessId: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  const userId = await getAuthUserId();

  await supabase.from("business_page_views").insert({
    business_id: businessId,
    viewer_id: userId ?? null,
  });
}

export async function trackOfferingClick(
  businessId: string,
  offeringName: string,
  clickType: string,
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  const userId = await getAuthUserId();

  await supabase.from("business_offering_clicks").insert({
    business_id: businessId,
    offering_name: offeringName,
    click_type: clickType,
    clicker_id: userId ?? null,
  });
}
