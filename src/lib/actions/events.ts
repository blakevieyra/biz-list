"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { geocodeUsZipCode } from "@/lib/geo/geocode";
import { moderateMultiple } from "@/lib/moderation/content-policy";
import { validateBusinessCategory, validateLocationFields } from "@/lib/validation/profile-fields";
import { canAccessCustomerFeature } from "@/lib/plans";
import type { PlanTier } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in.");

  return { supabase, user };
}

async function requireBusinessOwner(businessId: string) {
  const { supabase, user } = await requireUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_id, name, city, state, county, zip_code, latitude, longitude, category")
    .eq("id", businessId)
    .single();

  if (!business || business.owner_id !== user.id) {
    throw new Error("You can only manage events for your own business.");
  }

  return { supabase, user, business };
}

async function notifyCustomerProUsers(params: {
  type: "event" | "deal_alert" | "job_match";
  title: string;
  body: string;
  link: string;
  followerIds?: string[];
  city?: string;
  state?: string;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const userQuery = admin
    .from("profiles")
    .select("id, role, plan_tier, city, state, job_alert_opt_in")
    .in("plan_tier", ["pro", "platinum"]);

  const { data: proUsers } = await userQuery;
  if (!proUsers?.length) return;

  const recipients = proUsers.filter((profile) => {
    const plan = (profile.plan_tier ?? "free") as PlanTier;
    if (params.type === "event" && !canAccessCustomerFeature(plan, "eventNotifications")) {
      return false;
    }
    if (params.type === "deal_alert" && !canAccessCustomerFeature(plan, "firstPickDeals")) {
      return false;
    }
    if (params.type === "job_match" && !canAccessCustomerFeature(plan, "jobAlerts")) {
      return false;
    }
    if (params.type === "job_match" && !profile.job_alert_opt_in) {
      return false;
    }
    if (params.followerIds?.length && !params.followerIds.includes(profile.id)) {
      return false;
    }
    if (params.city && params.state && profile.city && profile.state) {
      const sameState = profile.state.toLowerCase() === params.state.toLowerCase();
      const sameCity = profile.city.toLowerCase() === params.city.toLowerCase();
      if (!sameState && !sameCity) return false;
    }
    return true;
  });

  if (!recipients.length) return;

  await admin.from("notifications").insert(
    recipients.map((profile) => ({
      user_id: profile.id,
      type: params.type,
      title: params.title.slice(0, 200),
      body: params.body.slice(0, 500),
      link: params.link.slice(0, 500),
    })),
  );
}

export async function createBusinessEvent(input: {
  businessId: string;
  title: string;
  description: string;
  location: string;
  address?: string;
  city?: string;
  state?: string;
  county?: string;
  zipCode?: string;
  category?: string;
  imageUrl?: string;
  startsAt: string;
  endsAt?: string;
  capacity?: number;
}) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to publish events." };

  try {
    const { supabase, user, business } = await requireBusinessOwner(input.businessId);

    const title = input.title.trim().slice(0, 200);
    const description = input.description.trim().slice(0, 5000);
    const location = input.location.trim().slice(0, 300);
    const moderation = moderateMultiple({ Title: title, Description: description, Location: location });
    if (!moderation.ok) return { error: moderation.reason };

    const city = (input.city ?? business.city ?? "").trim();
    const state = (input.state ?? business.state ?? "").trim();
    const zipCode = (input.zipCode ?? business.zip_code ?? "").trim();
    const locationCheck = validateLocationFields({ city, state, zipCode });
    if (locationCheck.error) return { error: locationCheck.error };

    const category = input.category?.trim() || business.category || "";
    if (category) {
      const categoryCheck = validateBusinessCategory(category);
      if (categoryCheck.error) return { error: categoryCheck.error };
    }

    let latitude = business.latitude ?? null;
    let longitude = business.longitude ?? null;
    if (zipCode && (!latitude || !longitude)) {
      const geo = await geocodeUsZipCode(zipCode);
      if (geo) {
        latitude = geo.latitude;
        longitude = geo.longitude;
      }
    }

    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) return { error: "Invalid start date." };

    const { data: event, error } = await supabase
      .from("business_events")
      .insert({
        business_id: input.businessId,
        author_id: user.id,
        title,
        description,
        location,
        address: (input.address ?? "").trim().slice(0, 300),
        city,
        state,
        county: (input.county ?? business.county ?? "").trim(),
        zip_code: zipCode,
        latitude,
        longitude,
        category,
        image_url: (input.imageUrl ?? "").trim().slice(0, 500),
        starts_at: startsAt.toISOString(),
        ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
        capacity: input.capacity ?? null,
        status: "published",
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    const { data: followers } = await supabase
      .from("business_follows")
      .select("follower_id")
      .eq("business_id", input.businessId);

    await notifyCustomerProUsers({
      type: "event",
      title: `New event: ${title}`,
      body: `${business.name} is hosting ${title} in ${city}, ${state}.`,
      link: `/events/${event.id}`,
      followerIds: (followers ?? []).map((f) => f.follower_id),
      city,
      state,
    });

    revalidatePath("/events");
    revalidatePath("/home");
    revalidatePath("/dashboard/events");
    return { success: true, eventId: event.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create event." };
  }
}

export async function toggleEventRsvp(eventId: string) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to RSVP." };

  try {
    const { supabase, user } = await requireUser();

    const { data: existing } = await supabase
      .from("event_rsvps")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.status === "going") {
      const { error } = await supabase.from("event_rsvps").delete().eq("id", existing.id);
      if (error) return { error: error.message };
    } else if (existing) {
      const { error } = await supabase
        .from("event_rsvps")
        .update({ status: "going" })
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("event_rsvps").insert({
        event_id: eventId,
        user_id: user.id,
        status: "going",
      });
      if (error) return { error: error.message };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/home");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update RSVP." };
  }
}

export async function commentOnEvent(eventId: string, body: string) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to comment on events." };

  try {
    const { supabase, user } = await requireUser();
    const trimmed = body.trim().slice(0, 1000);
    if (!trimmed) return { error: "Comment cannot be empty." };

    const moderation = moderateMultiple({ Comment: trimmed });
    if (!moderation.ok) return { error: moderation.reason };

    const { data: event } = await supabase
      .from("business_events")
      .select("id")
      .eq("id", eventId)
      .eq("status", "published")
      .maybeSingle();

    if (!event) return { error: "Event not found." };

    const { error } = await supabase.from("event_comments").insert({
      event_id: eventId,
      author_id: user.id,
      body: trimmed,
    });

    if (error) return { error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to post comment." };
  }
}

export async function notifyDealToCustomerPro(input: {
  businessId: string;
  businessName: string;
  postTitle: string;
  postId: string;
  city?: string;
  state?: string;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { data: followers } = await admin
    .from("business_follows")
    .select("follower_id")
    .eq("business_id", input.businessId);

  await notifyCustomerProUsers({
    type: "deal_alert",
    title: `Early deal: ${input.postTitle}`,
    body: `${input.businessName} shared a deal for AllConnect Plus subscribers first.`,
    link: `/feed?tab=sales`,
    followerIds: (followers ?? []).map((f) => f.follower_id),
    city: input.city,
    state: input.state,
  });
}

export async function notifyJobMatchToCustomerPro(input: {
  businessName: string;
  jobTitle: string;
  businessId: string;
  city?: string;
  state?: string;
}) {
  await notifyCustomerProUsers({
    type: "job_match",
    title: `Job match: ${input.jobTitle}`,
    body: `${input.businessName} is hiring for a role that may fit your profile.`,
    link: `/listings/${input.businessId}`,
    city: input.city,
    state: input.state,
  });
}
