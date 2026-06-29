"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AffiliateStatus = "pending" | "active" | "declined";

export interface BusinessAffiliate {
  id: string;
  businessId: string;
  businessName: string;
  businessCategory: string;
  businessCity: string;
  businessState: string;
  businessMediaUrl?: string;
  marketerId: string;
  marketerName: string;
  marketerAvatarUrl?: string;
  status: AffiliateStatus;
  createdAt: string;
}

async function requireUser() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase not configured.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return { supabase, user };
}

/** Marketer requests affiliation with a business. */
export async function requestAffiliation(businessId: string): Promise<{ error?: string; id?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase not configured." };
  try {
    const { supabase, user } = await requireUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "marketer") return { error: "Only marketer accounts can request affiliation." };

    const { data: existing } = await supabase
      .from("business_affiliates")
      .select("id, status")
      .eq("business_id", businessId)
      .eq("marketer_id", user.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "active") return { error: "You are already affiliated with this business." };
      if (existing.status === "pending") return { error: "Affiliation request already pending." };
      // declined — allow re-request by updating
      await supabase
        .from("business_affiliates")
        .update({ status: "pending" })
        .eq("id", existing.id);
      revalidatePath(`/listings/${businessId}`);
      return { id: existing.id };
    }

    const { data, error } = await supabase
      .from("business_affiliates")
      .insert({ business_id: businessId, marketer_id: user.id, status: "pending" })
      .select("id")
      .single();

    if (error) return { error: error.message };

    // Notify business owner
    const { data: biz } = await supabase
      .from("businesses")
      .select("owner_id, name")
      .eq("id", businessId)
      .single();

    if (biz?.owner_id) {
      await supabase.from("notifications").insert({
        user_id: biz.owner_id,
        type: "connection",
        title: "New affiliate request",
        body: `${profile.display_name} wants to work on behalf of ${biz.name} as an affiliate marketer.`,
        link: `/dashboard?tab=affiliates`,
      });
    }

    revalidatePath(`/listings/${businessId}`);
    revalidatePath("/dashboard/affiliates");
    return { id: data.id };
  } catch (e) {
    return { error: String(e) };
  }
}

/** Business owner accepts or declines an affiliation request. */
export async function respondToAffiliation(
  affiliateId: string,
  accept: boolean,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase not configured." };
  try {
    const { supabase, user } = await requireUser();

    const { data: row } = await supabase
      .from("business_affiliates")
      .select("id, marketer_id, business_id, businesses(name, owner_id)")
      .eq("id", affiliateId)
      .single();

    if (!row) return { error: "Affiliation not found." };
    const biz = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
    if (biz?.owner_id !== user.id) return { error: "Only the business owner can respond." };

    const newStatus: AffiliateStatus = accept ? "active" : "declined";
    await supabase
      .from("business_affiliates")
      .update({ status: newStatus })
      .eq("id", affiliateId);

    // Notify marketer
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    await supabase.from("notifications").insert({
      user_id: row.marketer_id,
      type: "connection",
      title: accept ? "Affiliation accepted" : "Affiliation declined",
      body: accept
        ? `${ownerProfile?.display_name ?? "The business owner"} accepted your request to affiliate with ${biz?.name}.`
        : `Your affiliation request for ${biz?.name} was declined.`,
      link: "/dashboard/affiliates",
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/affiliates");
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

/** Business owner or marketer removes an affiliation. */
export async function removeAffiliation(affiliateId: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase not configured." };
  try {
    const { supabase } = await requireUser();
    await supabase.from("business_affiliates").delete().eq("id", affiliateId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/affiliates");
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

/** Get all affiliations for the current marketer. */
export async function getMyAffiliations(): Promise<BusinessAffiliate[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("business_affiliates")
    .select("id, business_id, marketer_id, status, created_at, businesses(name, category, city, state, media_urls), profiles!marketer_id(display_name, avatar_url)")
    .eq("marketer_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const biz = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
    const marketer = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      businessId: row.business_id,
      businessName: biz?.name ?? "",
      businessCategory: biz?.category ?? "",
      businessCity: biz?.city ?? "",
      businessState: biz?.state ?? "",
      businessMediaUrl: (biz?.media_urls as string[] | undefined)?.[0],
      marketerId: row.marketer_id,
      marketerName: marketer?.display_name ?? "",
      marketerAvatarUrl: marketer?.avatar_url ?? undefined,
      status: row.status as AffiliateStatus,
      createdAt: row.created_at,
    };
  });
}

/** Get all affiliation requests for a business (owner view). */
export async function getBusinessAffiliates(businessId: string): Promise<BusinessAffiliate[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("business_affiliates")
    .select("id, business_id, marketer_id, status, created_at, businesses(name, category, city, state, media_urls), profiles!marketer_id(display_name, avatar_url)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const biz = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
    const marketer = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      businessId: row.business_id,
      businessName: biz?.name ?? "",
      businessCategory: biz?.category ?? "",
      businessCity: biz?.city ?? "",
      businessState: biz?.state ?? "",
      businessMediaUrl: (biz?.media_urls as string[] | undefined)?.[0],
      marketerId: row.marketer_id,
      marketerName: marketer?.display_name ?? "",
      marketerAvatarUrl: marketer?.avatar_url ?? undefined,
      status: row.status as AffiliateStatus,
      createdAt: row.created_at,
    };
  });
}

/** Check if the current user is an active affiliate of a business. */
export async function getAffiliationStatus(businessId: string): Promise<AffiliateStatus | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("business_affiliates")
    .select("status")
    .eq("business_id", businessId)
    .eq("marketer_id", user.id)
    .maybeSingle();

  return (data?.status as AffiliateStatus) ?? null;
}

/** Check if the current user can act on behalf of a business (owner OR active affiliate). */
export async function canActForBusiness(businessId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: biz } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .single();

  if (biz?.owner_id === user.id) return true;

  const { data: aff } = await supabase
    .from("business_affiliates")
    .select("id")
    .eq("business_id", businessId)
    .eq("marketer_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(aff);
}
