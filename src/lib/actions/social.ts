"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BusinessIntent, BusinessService, BusinessSocialLinks, DiscoveryRadius, ForumCategory, UserRole, FollowDigestFrequency } from "@/lib/types";
import { isValidJobTitle } from "@/lib/job-titles";
import { sanitizeMediaUrls, getSafeExternalUrl } from "@/lib/security/safe-url";
import { sanitizeServices, sanitizeSocialLinks } from "@/lib/security/sanitize-business";
import { moderateMultiple, moderateUserContent } from "@/lib/moderation/content-policy";
import {
  validateBusinessCategory,
  validateIndustryInterests,
  validateLocationFields,
} from "@/lib/validation/profile-fields";
import { geocodeUsZipCode } from "@/lib/geo/geocode";
import { DEFAULT_DISCOVERY_FILTER } from "@/lib/feed/location-scope";
import {
  emailCollaborationPublished,
  emailForumPostPublished,
  emailNotificationToUser,
  emailProfileComplete,
} from "@/lib/email/actions";

async function requireUser() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in.");

  return { supabase, user };
}

async function createNotification(
  _supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  params: {
    userId: string;
    type: "follow" | "connection" | "comment" | "message" | "collaboration";
    title: string;
    body: string;
    link: string;
    actorName?: string;
    businessName?: string;
    postTitle?: string;
  },
) {
  const admin = getSupabaseAdmin();
  if (admin) {
    await admin.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title.slice(0, 200),
      body: params.body.slice(0, 500),
      link: params.link.slice(0, 500),
    });
  }

  if (params.type !== "collaboration" && params.actorName) {
    await emailNotificationToUser(params.userId, params.type, {
      actorName: params.actorName,
      businessName: params.businessName,
      postTitle: params.postTitle,
      link: params.link,
    });
  }
}

export async function saveProfile(input: {
  displayName: string;
  role: UserRole;
  bio: string;
  city: string;
  state: string;
  zipCode?: string;
  country?: string;
  forumInterests: ForumCategory[];
  interestTags?: string[];
  industryInterests?: string[];
  headline?: string;
  skills?: string[];
  isSeekingWork?: boolean;
  discoveryRadius?: DiscoveryRadius;
  avatarUrl?: string;
  businessName?: string;
  tagline?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  website?: string;
  socialLinks?: BusinessSocialLinks;
  phone?: string;
  hours?: string;
  isHiring?: boolean;
  services?: BusinessService[];
  mediaUrls?: string[];
  intents?: BusinessIntent[];
  introPost?: { title: string; body: string; mediaUrls?: string[] };
}) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Profile saved in demo mode only." };
  }

  try {
    const { supabase, user } = await requireUser();

    const moderation = moderateMultiple({
      Name: input.displayName,
      Bio: input.bio,
      Description: input.description ?? "",
      Headline: input.headline ?? "",
    });
    if (!moderation.ok) return { error: moderation.reason };

    const location = validateLocationFields({
      city: input.city,
      state: input.state,
      zipCode: input.zipCode ?? "",
      country: input.country,
    });
    if (location.error) return { error: location.error };

    const isBusiness = input.role === "business" || input.role === "organization" || input.role === "marketer";
    let industryInterests = input.industryInterests ?? [];
    if (!isBusiness) {
      const industries = validateIndustryInterests(industryInterests);
      if (industries.error) return { error: industries.error };
      industryInterests = industries.values;
    }

    let category = input.category ?? "";
    let subcategory = input.subcategory ?? "";
    if (isBusiness && category) {
      const validatedCategory = validateBusinessCategory(category, subcategory);
      if (validatedCategory.error) return { error: validatedCategory.error };
      category = validatedCategory.category;
      subcategory = validatedCategory.subcategory;
    }

    const discoveryRadius = input.discoveryRadius ?? DEFAULT_DISCOVERY_FILTER;
    const geo = await geocodeUsZipCode(location.zipCode);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: input.displayName,
        role: input.role,
        bio: input.bio,
        city: input.city.trim(),
        state: input.state.trim(),
        zip_code: location.zipCode,
        country: location.country,
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        discovery_radius: discoveryRadius,
        forum_interests: input.forumInterests,
        interest_tags: input.interestTags ?? [],
        industry_interests: industryInterests,
        headline: input.headline ?? "",
        skills: input.skills ?? [],
        is_seeking_work: input.isSeekingWork ?? false,
        feed_scope:
          discoveryRadius === "state"
            ? "state"
            : discoveryRadius === "nation"
              ? "nationwide"
              : "local",
        ...(input.avatarUrl ? { avatar_url: input.avatarUrl } : {}),
      })
      .eq("id", user.id);

    if (profileError) return { error: profileError.message };

    if (isBusiness && input.businessName) {
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      const businessPayload = {
        owner_id: user.id,
        name: input.businessName,
        tagline: input.tagline ?? "",
        description: input.description ?? "",
        category,
        subcategory,
        city: input.city.trim(),
        state: input.state.trim(),
        zip_code: location.zipCode,
        country: location.country,
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        website: getSafeExternalUrl(input.website?.trim()) ?? null,
        social_links: sanitizeSocialLinks(input.socialLinks),
        phone: input.phone ?? "",
        hours: input.hours ?? "",
        is_hiring: input.isHiring ?? false,
        services: sanitizeServices(input.services),
        media_urls: sanitizeMediaUrls(input.mediaUrls),
        intents: input.intents ?? [],
      };

      let businessId = existing?.id;

      if (existing) {
        await supabase.from("businesses").update(businessPayload).eq("id", existing.id);
      } else {
        const { data: created } = await supabase
          .from("businesses")
          .insert(businessPayload)
          .select("id")
          .single();
        businessId = created?.id;
      }

      if (businessId && input.introPost?.title && input.introPost.body) {
        const introModeration = moderateMultiple({
          Title: input.introPost.title,
          Post: input.introPost.body,
        });
        if (!introModeration.ok) return { error: introModeration.reason };

        await supabase.from("business_posts").insert({
          business_id: businessId,
          author_id: user.id,
          title: input.introPost.title.slice(0, 200),
          body: input.introPost.body.slice(0, 5000),
          media_urls: sanitizeMediaUrls(input.introPost.mediaUrls),
        });
      }
    }

    revalidatePath("/", "layout");

    if (user.email) {
      await emailProfileComplete(user.email, input.displayName || "there");
    }

    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save profile." };
  }
}

export async function updateUserProfile(input: {
  displayName: string;
  bio: string;
  city: string;
  state: string;
  zipCode?: string;
  country?: string;
  headline?: string;
  skills?: string[];
  isSeekingWork?: boolean;
  interestTags?: string[];
  industryInterests?: string[];
  forumInterests?: ForumCategory[];
  discoveryRadius?: DiscoveryRadius;
  avatarUrl?: string | null;
}) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  try {
    const { supabase, user } = await requireUser();

    if (!input.displayName.trim()) return { error: "Display name is required." };

    const moderation = moderateMultiple({
      Name: input.displayName,
      Bio: input.bio,
      Headline: input.headline ?? "",
    });
    if (!moderation.ok) return { error: moderation.reason };

    const location = validateLocationFields({
      city: input.city,
      state: input.state,
      zipCode: input.zipCode ?? "",
      country: input.country,
    });
    if (location.error) return { error: location.error };

    const industries = validateIndustryInterests(input.industryInterests ?? []);
    if (industries.error) return { error: industries.error };

    const discoveryRadius = input.discoveryRadius ?? DEFAULT_DISCOVERY_FILTER;
    const geo = await geocodeUsZipCode(location.zipCode);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: input.displayName.trim(),
        bio: input.bio.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        zip_code: location.zipCode,
        country: location.country,
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        discovery_radius: discoveryRadius,
        headline: input.headline?.trim() ?? "",
        skills: input.skills ?? [],
        is_seeking_work: input.isSeekingWork ?? false,
        interest_tags: input.interestTags ?? [],
        industry_interests: industries.values,
        forum_interests: input.forumInterests ?? [],
        feed_scope:
          discoveryRadius === "state"
            ? "state"
            : discoveryRadius === "nation"
              ? "nationwide"
              : "local",
        ...(input.avatarUrl !== undefined
          ? { avatar_url: input.avatarUrl ? (getSafeExternalUrl(input.avatarUrl) ?? null) : null }
          : {}),
      })
      .eq("id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/listings");
    revalidatePath("/feed");
    revalidatePath("/profile/edit");
    revalidatePath(`/listings/people/${user.id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update profile." };
  }
}

export async function updateProfilePreferences(input: {
  followDigestFrequency?: FollowDigestFrequency;
  jobAlertOptIn?: boolean;
  isSeekingWork?: boolean;
  experienceText?: string;
  resumeText?: string;
  resumeUrl?: string;
  targetJobTitles?: string[];
  industryInterests?: string[];
  headline?: string;
  skills?: string[];
  zipCode?: string;
  discoveryRadius?: DiscoveryRadius;
}) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  try {
    const { supabase, user } = await requireUser();

    const moderation = moderateMultiple({
      Experience: input.experienceText ?? "",
      Resume: input.resumeText ?? "",
      Headline: input.headline ?? "",
    });
    if (!moderation.ok) return { error: moderation.reason };

    const industries = validateIndustryInterests(input.industryInterests ?? []);
    if (industries.error) return { error: industries.error };

    const titles = (input.targetJobTitles ?? []).filter(isValidJobTitle).slice(0, 8);
    const digest = input.followDigestFrequency ?? "none";
    const allowedDigest: FollowDigestFrequency[] = ["none", "daily", "weekly", "monthly"];
    if (!allowedDigest.includes(digest)) {
      return { error: "Invalid digest frequency." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        follow_digest_frequency: digest,
        job_alert_opt_in: input.jobAlertOptIn ?? false,
        is_seeking_work: input.isSeekingWork ?? false,
        experience_text: input.experienceText?.trim().slice(0, 4000) ?? "",
        resume_text: input.resumeText?.trim().slice(0, 4000) ?? "",
        ...(input.resumeUrl !== undefined ? { resume_url: input.resumeUrl } : {}),
        target_job_titles: titles,
        industry_interests: industries.values,
        headline: input.headline?.trim().slice(0, 200) ?? "",
        skills: (input.skills ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 20),
        ...(input.zipCode !== undefined ? { zip_code: input.zipCode.trim().slice(0, 10) } : {}),
        ...(input.discoveryRadius !== undefined ? { discovery_radius: input.discoveryRadius } : {}),
      })
      .eq("id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/profile");
    revalidatePath("/profile/edit");
    revalidatePath("/dashboard/profile");
    revalidatePath("/home");
    revalidatePath(`/listings/people/${user.id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save preferences." };
  }
}

export async function startMessageWithUser(otherUserId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to send messages." };
  }

  try {
    const { user } = await requireUser();
    if (otherUserId === user.id) {
      return { error: "You cannot message yourself." };
    }

    const result = await getOrCreateConversation(otherUserId);
    if ("error" in result && result.error) return { error: result.error };
    if (!result.conversationId) return { error: "Could not create conversation." };

    return { conversationId: result.conversationId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to start conversation." };
  }
}

export async function toggleFollowBusiness(businessId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to follow businesses." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { data: existing } = await supabase
      .from("business_follows")
      .select("id")
      .eq("business_id", businessId)
      .eq("follower_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("business_follows").delete().eq("id", existing.id);
    } else {
      await supabase.from("business_follows").insert({
        business_id: businessId,
        follower_id: user.id,
      });

      const { data: business } = await supabase
        .from("businesses")
        .select("name, owner_id")
        .eq("id", businessId)
        .single();

      if (business && business.owner_id !== user.id) {
        const { data: follower } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        const followerName = follower?.display_name ?? "Someone";

        await createNotification(supabase, {
          userId: business.owner_id,
          type: "follow",
          title: "New follower",
          body: `${followerName} followed ${business.name}`,
          link: `/listings/${businessId}`,
          actorName: followerName,
          businessName: business.name,
        });

        // Fire emailMe + leadOutreach automations (non-blocking)
        import("@/lib/actions/automations").then(({ triggerFollowAutomations }) =>
          triggerFollowAutomations(businessId, business.name as string, user.id, followerName)
        ).catch(() => {});
      }
    }

    revalidatePath(`/listings/${businessId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update follow." };
  }
}

export async function requestConnection(businessId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to connect with businesses." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { data: business } = await supabase
      .from("businesses")
      .select("name, owner_id")
      .eq("id", businessId)
      .single();

    if (!business) return { error: "Business not found." };
    if (business.owner_id === user.id) {
      return { error: "You cannot connect with your own business." };
    }

    const { error } = await supabase.from("business_connections").upsert(
      {
        requester_id: user.id,
        business_id: businessId,
        status: "pending",
      },
      { onConflict: "requester_id,business_id" },
    );

    if (error) return { error: error.message };

    const { data: requester } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    await createNotification(supabase, {
      userId: business.owner_id,
      type: "connection",
      title: "Connection request",
      body: `${requester?.display_name ?? "Someone"} wants to connect with ${business.name}`,
      link: `/listings/${businessId}`,
      actorName: requester?.display_name ?? "Someone",
      businessName: business.name,
    });

    revalidatePath(`/listings/${businessId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to request connection." };
  }
}

export async function createForumPost(input: {
  category: ForumCategory;
  title: string;
  body: string;
  imageUrl?: string;
}) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to publish forum posts." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const allowedRoles = ["business", "organization", "marketer"];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return { error: "Only business, organization, or marketer accounts can create forum posts." };
    }

    const moderation = moderateMultiple({ Title: input.title, Post: input.body });
    if (!moderation.ok) return { error: moderation.reason };

    const imageUrl = input.imageUrl?.trim() || null;

    const { data, error } = await supabase
      .from("forum_posts")
      .insert({
        author_id: user.id,
        category: input.category,
        title: input.title,
        body: input.body,
        image_url: imageUrl,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    const { data: author } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .single();

    if (author?.email) {
      await emailForumPostPublished(
        author.email,
        author.display_name ?? "there",
        input.title,
        `/forum?post=${data.id}`,
      );
    }

    revalidatePath("/feed");
    revalidatePath("/partnerships");
    revalidatePath("/forum");
    return { success: true, id: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create post." };
  }
}

export async function createComment(postId: string, body: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to post comments." };
  }

  try {
    const { supabase, user } = await requireUser();
    const raw = body.trim();
    if (!raw) return { error: "Comment cannot be empty." };
    const moderation = moderateUserContent(raw, "Comment");
    if (!moderation.ok) return { error: moderation.reason };
    const trimmed = raw.slice(0, 2000);

    const { error } = await supabase.from("forum_comments").insert({
      post_id: postId,
      author_id: user.id,
      body: trimmed,
    });

    if (error) return { error: error.message };

    const { data: post } = await supabase
      .from("forum_posts")
      .select("author_id, title")
      .eq("id", postId)
      .single();

    if (post && post.author_id !== user.id) {
      const { data: commenter } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      await createNotification(supabase, {
        userId: post.author_id,
        type: "comment",
        title: "New comment on your post",
        body: `${commenter?.display_name ?? "Someone"} commented on "${post.title}"`,
        link: `/forum?post=${postId}`,
        actorName: commenter?.display_name ?? "Someone",
        postTitle: post.title,
      });
    }

    revalidatePath("/partnerships");
    revalidatePath("/forum");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to post comment." };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function toggleForumPostLike(postId: string) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to like posts." };
  if (!UUID_RE.test(postId)) return { liked: false, likeCount: 0 };

  try {
    const { supabase, user } = await requireUser();

    const { data: existing } = await supabase
      .from("forum_post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("forum_post_likes").delete().eq("id", existing.id);
    } else {
      await supabase.from("forum_post_likes").insert({ post_id: postId, user_id: user.id });
    }

    const { data: counts } = await supabase
      .from("forum_post_likes")
      .select("id")
      .eq("post_id", postId);

    revalidatePath("/forum");
    return { liked: !existing, likeCount: counts?.length ?? 0 };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to toggle interest." };
  }
}

export async function createCollaboration(input: {
  title: string;
  summary: string;
  requirements?: string;
  deadline?: string;
  attachmentUrls?: string[];
  lookingFor: string;
  location: string;
  businessId?: string;
  collaborationType?: import("@/lib/types").CollaborationType;
}) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to publish collaboration ideas." };
  }

  try {
    const { supabase, user } = await requireUser();

    const moderation = moderateMultiple({
      Title: input.title,
      Summary: input.summary,
      "Looking for": input.lookingFor,
      Location: input.location,
      ...(input.requirements ? { Requirements: input.requirements } : {}),
    });
    if (!moderation.ok) return { error: moderation.reason };

    const collaborationType =
      input.collaborationType === "contract" || input.collaborationType === "b2b_sale"
        ? input.collaborationType
        : "proposal";

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "business" && profile?.role !== "organization") {
      return { error: "Only business and organization accounts can publish collaborations." };
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business?.id) {
      return {
        error: "Create your business listing before publishing collaborations.",
      };
    }

    const { error } = await supabase.from("collaborations").insert({
      author_id: user.id,
      business_id: business.id,
      title: input.title.trim().slice(0, 200),
      summary: input.summary.trim().slice(0, 2000),
      requirements: input.requirements?.trim().slice(0, 2000) || null,
      deadline: input.deadline || null,
      attachment_urls: input.attachmentUrls ?? [],
      looking_for: input.lookingFor.trim().slice(0, 500),
      location: input.location.trim().slice(0, 200),
      collaboration_type: collaborationType,
    });

    if (error) return { error: error.message };

    const { data: author } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .single();

    if (author?.email) {
      await emailCollaborationPublished(
        author.email,
        author.display_name ?? "there",
        input.title,
      );
    }

    revalidatePath("/partnerships");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create collaboration." };
  }
}

export async function toggleCollaborationInterest(collaborationId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to show interest." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { data: existing } = await supabase
      .from("collaboration_interests")
      .select("id")
      .eq("collaboration_id", collaborationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("collaboration_interests")
        .delete()
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("collaboration_interests").insert({
        collaboration_id: collaborationId,
        user_id: user.id,
      });
      if (error) return { error: error.message };
    }

    revalidatePath("/partnerships");
    revalidatePath(`/partnerships/${collaborationId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update interest." };
  }
}

export async function submitCollaborationOffer(collaborationId: string, message: string, attachmentUrls?: string[]) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase to submit an offer." };
  try {
    const { supabase, user } = await requireUser();
    const raw = message.trim();
    if (!raw) return { error: "Message cannot be empty." };
    const moderation = moderateUserContent(raw, "Message");
    if (!moderation.ok) return { error: moderation.reason };
    const trimmed = raw.slice(0, 2000);

    const { data: collab } = await supabase
      .from("collaborations")
      .select("author_id, title")
      .eq("id", collaborationId)
      .single();

    if (!collab) return { error: "Collaboration not found." };
    if (collab.author_id === user.id) return { error: "You cannot submit an offer on your own collaboration." };

    const { error } = await supabase.from("collaboration_comments").insert({
      collaboration_id: collaborationId,
      author_id: user.id,
      body: trimmed,
      attachment_urls: attachmentUrls ?? [],
    });
    if (error) return { error: error.message };

    // Mark collaboration as in discussion
    await supabase
      .from("collaborations")
      .update({ status: "in_discussion" })
      .eq("id", collaborationId)
      .eq("status", "open");

    // Notify creator
    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const { emailCollaborationOffer } = await import("@/lib/email/actions");
    await emailCollaborationOffer(
      collab.author_id,
      sender?.display_name ?? "Someone",
      collab.title,
      trimmed,
      collaborationId,
    );

    await createNotification(supabase, {
      userId: collab.author_id,
      type: "collaboration",
      title: "New offer on your collaboration",
      body: `${sender?.display_name ?? "Someone"} submitted an offer on "${collab.title}"`,
      link: `/partnerships/${collaborationId}`,
      actorName: sender?.display_name,
    });

    revalidatePath("/partnerships");
    revalidatePath(`/partnerships/${collaborationId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to submit offer." };
  }
}

export async function commentOnCollaboration(collaborationId: string, body: string, attachmentUrls?: string[]) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to comment." };
  }

  try {
    const { supabase, user } = await requireUser();
    const raw = body.trim();
    if (!raw) return { error: "Comment cannot be empty." };
    const moderation = moderateUserContent(raw, "Comment");
    if (!moderation.ok) return { error: moderation.reason };
    const trimmed = raw.slice(0, 1000);

    const { error } = await supabase.from("collaboration_comments").insert({
      collaboration_id: collaborationId,
      author_id: user.id,
      body: trimmed,
      attachment_urls: attachmentUrls ?? [],
    });

    if (error) return { error: error.message };

    revalidatePath("/partnerships");
    revalidatePath(`/partnerships/${collaborationId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to post comment." };
  }
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  revalidatePath("/notifications");
}

function orderedParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversation(
  otherUserId: string,
  businessId?: string,
  options?: { skipAutomations?: boolean },
) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to send messages." };
  }

  try {
    const { supabase, user } = await requireUser();
    const [participantA, participantB] = orderedParticipants(user.id, otherUserId);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_a", participantA)
      .eq("participant_b", participantB)
      .maybeSingle();

    if (existing) return { conversationId: existing.id };

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        participant_a: participantA,
        participant_b: participantB,
        business_id: businessId ?? null,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    // Trigger emailMe automation when a NEW business conversation starts
    if (businessId && !options?.skipAutomations) {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      const { data: biz } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", businessId)
        .maybeSingle();
      const senderName = (senderProfile as { display_name?: string } | null)?.display_name ?? "Someone";
      const bizName = (biz as { name?: string } | null)?.name ?? "your listing";
      import("@/lib/actions/automations").then(({ triggerNewConversationEmail }) =>
        triggerNewConversationEmail(businessId, bizName, senderName)
      ).catch(() => {});
    }

    return { conversationId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to start conversation." };
  }
}

export async function sendMessage(conversationId: string, body: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to send messages." };
  }

  try {
    const { supabase, user } = await requireUser();

    const rawMsg = body.trim();
    if (!rawMsg) return { error: "Message cannot be empty." };
    const moderation = moderateUserContent(rawMsg, "Message");
    if (!moderation.ok) return { error: moderation.reason };
    const trimmed = rawMsg.slice(0, 5000);

    const { data: conversation } = await supabase
      .from("conversations")
      .select("participant_a, participant_b")
      .eq("id", conversationId)
      .single();

    if (!conversation) return { error: "Conversation not found." };

    const isParticipant =
      conversation.participant_a === user.id ||
      conversation.participant_b === user.id;

    if (!isParticipant) return { error: "You are not part of this conversation." };

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: trimmed,
    });

    if (error) return { error: error.message };

    const recipientId =
      conversation.participant_a === user.id
        ? conversation.participant_b
        : conversation.participant_a;

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();

    if (senderProfile?.role === "customer") {
      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", recipientId)
        .eq("virtual_agent_enabled", true)
        .maybeSingle();

      if (business) {
        const { data: owner } = await supabase
          .from("profiles")
          .select("plan_tier")
          .eq("id", recipientId)
          .maybeSingle();

        const { canAccess } = await import("@/lib/plans");
        const { generateVirtualAgentReplyAI } = await import("@/lib/ai/ai-services");

        if (canAccess((owner?.plan_tier ?? "free") as import("@/lib/types").PlanTier, "virtualAgent")) {
          const services = Array.isArray(business.services)
            ? (business.services as { name?: string; description?: string; price?: string }[])
            : [];

          const reply = await generateVirtualAgentReplyAI(
            {
              business: {
                name: business.name,
                category: business.category,
                subcategory: business.subcategory ?? "",
                tagline: business.tagline ?? "",
                description: business.description ?? "",
                city: business.city ?? "",
                state: business.state ?? "",
                phone: business.phone ?? "",
                hours: business.hours ?? "",
                website: business.website ?? "",
                isHiring: business.is_hiring ?? false,
                services: services.map((s) => ({
                  name: s.name ?? "Service",
                  description: s.description ?? "",
                  price: s.price,
                })),
              },
              customerName: senderProfile.display_name,
            },
            trimmed,
          );

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: recipientId,
            body: reply,
          });

          await createNotification(supabase, {
            userId: user.id,
            type: "message",
            title: `Reply from ${business.name}`,
            body: "Your message received an automated assistant reply.",
            link: `/messages/${conversationId}`,
            actorName: business.name,
            businessName: business.name,
          });
        }
      }
    }

    if (conversation) {
      const notifyRecipientId = recipientId;

      const { data: sender } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      await createNotification(supabase, {
        userId: notifyRecipientId,
        type: "message",
        title: "New message",
        body: `${sender?.display_name ?? "Someone"} sent you a message`,
        link: `/messages/${conversationId}`,
        actorName: sender?.display_name ?? "Someone",
      });
    }

    revalidatePath(`/messages/${conversationId}`);
    revalidatePath("/messages");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send message." };
  }
}

export async function deleteBusinessPost(postId: string) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase." };
  try {
    const { supabase, user } = await requireUser();

    const { data: post } = await supabase
      .from("business_posts")
      .select("author_id, business_id")
      .eq("id", postId)
      .single();

    if (!post) return { error: "Post not found." };

    const isAuthor = post.author_id === user.id;
    if (!isAuthor) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", post.business_id)
        .single();
      if (biz?.owner_id !== user.id) return { error: "Not authorized." };
    }

    const { error } = await supabase.from("business_posts").delete().eq("id", postId);
    if (error) return { error: error.message };

    revalidatePath("/feed");
    revalidatePath(`/listings/${post.business_id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete post." };
  }
}

export async function deleteForumPost(postId: string) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase." };
  try {
    const { supabase, user } = await requireUser();

    const { data: post } = await supabase
      .from("forum_posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (!post) return { error: "Post not found." };
    if (post.author_id !== user.id) return { error: "Not authorized." };

    const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
    if (error) return { error: error.message };

    revalidatePath("/forum");
    revalidatePath("/feed");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete post." };
  }
}

export async function deleteCollaboration(collaborationId: string) {
  if (!isSupabaseConfigured()) return { error: "Connect Supabase." };
  try {
    const { supabase, user } = await requireUser();

    const { data: collab } = await supabase
      .from("collaborations")
      .select("author_id")
      .eq("id", collaborationId)
      .single();

    if (!collab) return { error: "Collaboration not found." };
    if (collab.author_id !== user.id) return { error: "Not authorized." };

    const { error } = await supabase.from("collaborations").delete().eq("id", collaborationId);
    if (error) return { error: error.message };

    revalidatePath("/partnerships");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete." };
  }
}

export async function startMessageWithBusinessOwner(businessId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to send messages." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: business } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .single();

  if (!business) return { error: "Business not found." };

  const result = await getOrCreateConversation(business.owner_id, businessId);
  if ("error" in result && result.error) return { error: result.error };
  if (!result.conversationId) return { error: "Could not create conversation." };

  return { conversationId: result.conversationId };
}
