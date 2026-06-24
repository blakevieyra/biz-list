"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { canAccess } from "@/lib/plans";
import { sanitizeMediaUrls, getSafeExternalUrl } from "@/lib/security/safe-url";
import { sanitizeServices, sanitizeSocialLinks } from "@/lib/security/sanitize-business";
import { moderateMultiple, moderateUserContent } from "@/lib/moderation/content-policy";
import {
  validateBusinessCategory,
  validateLocationFields,
} from "@/lib/validation/profile-fields";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BusinessIntent, BusinessService, BusinessSocialLinks, PlanTier, BusinessPostType } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  return { supabase, user, plan: (profile?.plan_tier ?? "free") as PlanTier };
}

async function requireBusinessOwner(businessId: string) {
  const { supabase, user, plan } = await requireUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .single();

  if (!business) throw new Error("Business not found.");
  if (business.owner_id !== user.id) throw new Error("Only the business owner can do this.");

  return { supabase, user, plan, businessId };
}

export async function toggleLikeBusiness(businessId: string) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to like businesses." };

  try {
    const { supabase, user } = await requireUser();

    const { data: existing } = await supabase
      .from("business_likes")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("business_likes").delete().eq("id", existing.id);
    } else {
      await supabase.from("business_likes").insert({
        business_id: businessId,
        user_id: user.id,
      });
    }

    revalidatePath(`/listings/${businessId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update like." };
  }
}

export async function submitBusinessReview(input: {
  businessId: string;
  rating: number;
  body: string;
}) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to leave reviews." };

  try {
    const { supabase, user } = await requireUser();

    const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
    const body = input.body.trim().slice(0, 2000);
    if (!body) return { error: "Review cannot be empty." };

    const moderation = moderateUserContent(body, "Review");
    if (!moderation.ok) return { error: moderation.reason };

    const { data: business } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", input.businessId)
      .single();

    if (!business) return { error: "Business not found." };
    if (business.owner_id === user.id) {
      return { error: "You cannot review your own business." };
    }

    const { error } = await supabase.from("business_reviews").upsert(
      {
        business_id: input.businessId,
        author_id: user.id,
        rating,
        body,
      },
      { onConflict: "business_id,author_id" },
    );

    if (error) return { error: error.message };

    revalidatePath(`/listings/${input.businessId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to submit review." };
  }
}

export async function updateBusinessDetails(input: {
  businessId: string;
  phone?: string;
  hours?: string;
  importantInfo?: string;
  isHiring?: boolean;
  services?: BusinessService[];
  mediaUrls?: string[];
}) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to update profile." };

  try {
    const { supabase, plan } = await requireBusinessOwner(input.businessId);
    if (!canAccess(plan, "servicesListing")) {
      return { error: "Complete your business profile to manage services." };
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        phone: input.phone ?? "",
        hours: input.hours ?? "",
        important_info: input.importantInfo ?? "",
        is_hiring: input.isHiring ?? false,
        services: sanitizeServices(input.services),
        media_urls: sanitizeMediaUrls(input.mediaUrls),
      })
      .eq("id", input.businessId);

    if (error) return { error: error.message };

    revalidatePath(`/listings/${input.businessId}`);
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update business." };
  }
}

export async function saveBusinessDashboardProfile(input: {
  businessId: string;
  displayName: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  subcategory: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
  socialLinks: BusinessSocialLinks;
  phone: string;
  hours: string;
  importantInfo: string;
  isHiring: boolean;
  services: BusinessService[];
  mediaUrls: string[];
  intents: BusinessIntent[];
}) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to update profile." };

  try {
    const { supabase, user, plan } = await requireBusinessOwner(input.businessId);
    if (!canAccess(plan, "servicesListing")) {
      return { error: "Complete your business profile to manage your listing." };
    }

    if (!input.name.trim()) return { error: "Business name is required." };

    const moderation = moderateMultiple({
      Name: input.name,
      Tagline: input.tagline,
      Description: input.description,
      "Important info": input.importantInfo,
    });
    if (!moderation.ok) return { error: moderation.reason };

    const location = validateLocationFields({
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
    });
    if (location.error) return { error: location.error };

    const validatedCategory = validateBusinessCategory(input.category, input.subcategory);
    if (validatedCategory.error) return { error: validatedCategory.error };

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: input.displayName.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        zip_code: location.zipCode,
      })
      .eq("id", user.id);

    if (profileError) return { error: profileError.message };

    const services = sanitizeServices(input.services);
    const socialLinks = sanitizeSocialLinks(input.socialLinks);
    const website = getSafeExternalUrl(input.website.trim()) ?? null;

    const { error } = await supabase
      .from("businesses")
      .update({
        name: input.name.trim(),
        tagline: input.tagline.trim(),
        description: input.description.trim(),
        category: validatedCategory.category,
        subcategory: validatedCategory.subcategory,
        city: input.city.trim(),
        state: input.state.trim(),
        zip_code: location.zipCode,
        website,
        social_links: socialLinks,
        phone: input.phone.trim(),
        hours: input.hours.trim(),
        important_info: input.importantInfo.trim(),
        is_hiring: input.isHiring,
        services,
        media_urls: sanitizeMediaUrls(input.mediaUrls),
        intents: input.intents,
      })
      .eq("id", input.businessId);

    if (error) return { error: error.message };

    revalidatePath(`/listings/${input.businessId}`);
    revalidatePath("/listings");
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save profile." };
  }
}

export async function createBusinessPost(input: {
  businessId: string;
  postType?: BusinessPostType;
  title: string;
  body: string;
  mediaUrls?: string[];
}) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to post." };

  try {
    const { supabase, user, plan } = await requireBusinessOwner(input.businessId);
    if (!canAccess(plan, "businessPosts")) {
      return { error: "Upgrade your plan to publish posts." };
    }

    const title = input.title.trim().slice(0, 200);
    const body = input.body.trim().slice(0, 5000);
    const moderation = moderateMultiple({ Title: title, Post: body });
    if (!moderation.ok) return { error: moderation.reason };

    const postType = input.postType ?? "update";
    const allowed = ["update", "job", "deal", "video"];
    if (!allowed.includes(postType)) {
      return { error: "Invalid post type." };
    }

    const initialBoost = canAccess(plan, "trendingBoost") ? 3 : 0;

    const { error } = await supabase.from("business_posts").insert({
      business_id: input.businessId,
      author_id: user.id,
      post_type: postType,
      title,
      body,
      media_urls: sanitizeMediaUrls(input.mediaUrls),
      engagement_score: initialBoost,
      is_trending: canAccess(plan, "trendingBoost") && initialBoost >= 3,
    });

    if (error) return { error: error.message };

    if (postType === "job") {
      await supabase.from("businesses").update({ is_hiring: true }).eq("id", input.businessId);
    }

    revalidatePath(`/listings/${input.businessId}`);
    revalidatePath("/feed");
    revalidatePath("/dashboard/posts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create post." };
  }
}

export async function commentOnBusinessPost(postId: string, body: string) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to comment." };

  try {
    const { supabase, user } = await requireUser();

    const { data: post } = await supabase
      .from("business_posts")
      .select("business_id")
      .eq("id", postId)
      .single();

    if (!post) return { error: "Post not found." };

    const trimmed = body.trim().slice(0, 2000);
    const moderation = moderateUserContent(trimmed, "Comment");
    if (!moderation.ok) return { error: moderation.reason };

    const { error } = await supabase.from("business_post_comments").insert({
      post_id: postId,
      author_id: user.id,
      body: trimmed,
    });

    if (error) return { error: error.message };

    revalidatePath(`/listings/${post.business_id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to comment." };
  }
}

export async function createWorkGroup(input: {
  title: string;
  focusArea: string;
  description: string;
  location: string;
  businessId?: string;
}) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to create groups." };

  try {
    const { supabase, user, plan } = await requireUser();
    if (!canAccess(plan, "workGroups")) {
      return { error: "Business account required to create work groups." };
    }

    const { error } = await supabase.from("work_groups").insert({
      creator_id: user.id,
      business_id: input.businessId ?? null,
      title: input.title,
      focus_area: input.focusArea,
      description: input.description,
      location: input.location,
    });

    if (error) return { error: error.message };

    revalidatePath("/partnerships");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create group." };
  }
}

export async function submitJobApplication(input: { businessId: string; message: string }) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to apply." };

  try {
    const { supabase, user } = await requireUser();
    const message = input.message.trim().slice(0, 2000);
    if (!message) return { error: "Tell the business why you're a good fit." };

    const moderation = moderateUserContent(message, "Application");
    if (!moderation.ok) return { error: moderation.reason };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "customer") {
      return { error: "Only customer profiles can apply for jobs." };
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("owner_id, name, is_hiring")
      .eq("id", input.businessId)
      .single();

    if (!business?.is_hiring) return { error: "This business is not accepting applications." };
    if (business.owner_id === user.id) return { error: "You cannot apply to your own business." };

    const { error } = await supabase.from("job_applications").upsert(
      {
        business_id: input.businessId,
        applicant_id: user.id,
        message,
        status: "pending",
      },
      { onConflict: "business_id,applicant_id" },
    );

    if (error) return { error: error.message };

    const { data: applicant } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const admin = getSupabaseAdmin();
    if (admin) {
      await admin.from("notifications").insert({
        user_id: business.owner_id,
        type: "message",
        title: "New job application",
        body: `${applicant?.display_name ?? "Someone"} applied to ${business.name}`,
        link: "/dashboard/applications",
      });
    }

    revalidatePath(`/listings/${input.businessId}`);
    revalidatePath("/dashboard/applications");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to submit application." };
  }
}

export async function updateJobApplicationStatus(input: {
  applicationId: string;
  businessId: string;
  status: "reviewed" | "accepted" | "declined";
}) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to update applications." };

  try {
    const { supabase } = await requireBusinessOwner(input.businessId);

    const { error } = await supabase
      .from("job_applications")
      .update({ status: input.status })
      .eq("id", input.applicationId)
      .eq("business_id", input.businessId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/applications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update application." };
  }
}

export async function submitServiceOrder(input: {
  businessId: string;
  serviceName: string;
  message: string;
  quantity?: string;
}) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to place orders." };

  try {
    const { supabase, user } = await requireUser();
    const message = input.message.trim().slice(0, 2000);
    const quantity = input.quantity?.trim().slice(0, 100) ?? "";
    const serviceName = input.serviceName.trim().slice(0, 120);

    if (!serviceName) return { error: "Service name is required." };
    if (!message) return { error: "Tell the business what you need." };

    const moderation = moderateUserContent(message, "Order");
    if (!moderation.ok) return { error: moderation.reason };

    const { data: business } = await supabase
      .from("businesses")
      .select("owner_id, name, services")
      .eq("id", input.businessId)
      .single();

    if (!business) return { error: "Business not found." };
    if (business.owner_id === user.id) {
      return { error: "You cannot order from your own business." };
    }

    const services = sanitizeServices(business.services as BusinessService[] | undefined);
    const service = services.find((s) => s.name === serviceName);
    if (!service || service.actionType !== "form") {
      return { error: "This service does not accept in-app orders." };
    }

    const { error } = await supabase.from("service_orders").insert({
      business_id: input.businessId,
      customer_id: user.id,
      service_name: serviceName,
      message,
      quantity,
      status: "pending",
    });

    if (error) return { error: error.message };

    const { data: customer } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const admin = getSupabaseAdmin();
    if (admin) {
      await admin.from("notifications").insert({
        user_id: business.owner_id,
        type: "message",
        title: "New service order",
        body: `${customer?.display_name ?? "Someone"} ordered ${serviceName} at ${business.name}`,
        link: "/dashboard/orders",
      });
    }

    revalidatePath(`/listings/${input.businessId}`);
    revalidatePath("/dashboard/orders");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to submit order." };
  }
}

export async function updateServiceOrderStatus(input: {
  orderId: string;
  businessId: string;
  status: "reviewed" | "accepted" | "declined";
}) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to update orders." };

  try {
    const { supabase } = await requireBusinessOwner(input.businessId);

    const { error } = await supabase
      .from("service_orders")
      .update({ status: input.status })
      .eq("id", input.orderId)
      .eq("business_id", input.businessId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update order." };
  }
}
