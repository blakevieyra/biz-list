import type {
  BusinessIntent,
  BusinessProfile,
  BusinessService,
  CollaborationIdea,
  Comment,
  ForumCategory,
  ForumPost,
  DiscoveryRadius,
  UserProfile,
  UserRole,
  PlanTier,
} from "@/lib/types";
import { resolveAreaScope } from "@/lib/feed/location-scope";
import { parseSocialLinks } from "@/lib/social-platforms";
import { parseJobApplicationForm } from "@/lib/job-application-form";
import type { AreaScope } from "@/lib/types";

type ProfileRow = {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  plan_tier?: PlanTier | "basic";
  bio: string;
  city: string;
  state: string;
  county?: string;
  zip_code?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  discovery_radius?: DiscoveryRadius;
  forum_interests: ForumCategory[];
  interest_tags?: string[];
  industry_interests?: string[];
  headline?: string;
  skills?: string[];
  is_seeking_work?: boolean;
  experience_text?: string;
  resume_text?: string;
  resume_url?: string | null;
  target_job_titles?: string[];
  job_alert_opt_in?: boolean;
  follow_digest_frequency?: "none" | "daily" | "weekly" | "monthly";
  feed_scope?: "local" | "state" | "nationwide";
  avatar_url?: string | null;
  created_at: string;
};

function mapDiscoveryRadius(row: ProfileRow): AreaScope {
  return resolveAreaScope(row.discovery_radius, row.feed_scope);
}

type BusinessRow = {
  id: string;
  owner_id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  subcategory?: string;
  city: string;
  state: string;
  county?: string;
  zip_code?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  website: string | null;
  social_links?: unknown;
  phone?: string;
  hours?: string;
  important_info?: string;
  is_hiring?: boolean;
  job_title?: string;
  job_description?: string;
  job_requirements?: string;
  job_application_form?: unknown;
  services?: unknown;
  media_urls?: string[];
  like_count?: number;
  rating_avg?: number;
  rating_count?: number;
  intents: BusinessIntent[];
  virtual_agent_enabled?: boolean;
  created_at: string;
};

type PostProfileSummary = {
  display_name: string;
  avatar_url?: string | null;
  businesses?: { id: string } | { id: string }[] | null;
};

type PostRow = {
  id: string;
  author_id: string;
  category: ForumCategory;
  title: string;
  body: string;
  image_url?: string | null;
  created_at: string;
  profiles?: PostProfileSummary | PostProfileSummary[] | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

type CollaborationRow = {
  id: string;
  author_id: string;
  business_id: string | null;
  title: string;
  summary: string;
  looking_for: string;
  location: string;
  requirements?: string | null;
  deadline?: string | null;
  attachment_urls?: string[] | null;
  collaboration_type?: CollaborationIdea["collaborationType"];
  status: CollaborationIdea["status"];
  created_at: string;
  profiles?: { display_name: string; avatar_url?: string | null } | { display_name: string; avatar_url?: string | null }[] | null;
  businesses?:
    | {
        name: string;
        category?: string;
        media_urls?: string[];
        rating_avg?: number;
        rating_count?: number;
        city?: string;
        state?: string;
        zip_code?: string;
        county?: string;
        country?: string;
        latitude?: number | null;
        longitude?: number | null;
      }
    | {
        name: string;
        category?: string;
        media_urls?: string[];
        rating_avg?: number;
        rating_count?: number;
        city?: string;
        state?: string;
        zip_code?: string;
        county?: string;
        country?: string;
        latitude?: number | null;
        longitude?: number | null;
      }[]
    | null;
};

function collaborationBusinessMeta(
  businesses: CollaborationRow["businesses"],
): {
  name?: string;
  category?: string;
  mediaUrl?: string;
  ratingAvg?: number;
  ratingCount?: number;
} {
  if (!businesses) return {};
  const row = Array.isArray(businesses) ? businesses[0] : businesses;
  if (!row) return {};
  return {
    name: row.name,
    category: row.category,
    mediaUrl: row.media_urls?.[0],
    ratingAvg: row.rating_avg != null ? Number(row.rating_avg) : undefined,
    ratingCount: row.rating_count,
  };
}

function profileName(
  profiles: { display_name: string; avatar_url?: string | null } | { display_name: string; avatar_url?: string | null }[] | null | undefined,
): string {
  if (!profiles) return "Unknown";
  if (Array.isArray(profiles)) return profiles[0]?.display_name ?? "Unknown";
  return profiles.display_name;
}

function profileAvatar(
  profiles: { display_name: string; avatar_url?: string | null } | { display_name: string; avatar_url?: string | null }[] | null | undefined,
): string | undefined {
  if (!profiles) return undefined;
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  return p?.avatar_url ?? undefined;
}

export function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    planTier: row.plan_tier === "basic" ? "free" : (row.plan_tier ?? "free"),
    bio: row.bio,
    city: row.city,
    state: row.state,
    county: row.county ?? "",
    zipCode: row.zip_code ?? "",
    country: row.country ?? "US",
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    interestTags: row.interest_tags ?? [],
    industryInterests: row.industry_interests ?? [],
    headline: row.headline ?? "",
    skills: row.skills ?? [],
    isSeekingWork: row.is_seeking_work ?? false,
    experienceText: row.experience_text ?? "",
    resumeText: row.resume_text ?? "",
    resumeUrl: row.resume_url ?? undefined,
    targetJobTitles: row.target_job_titles ?? [],
    jobAlertOptIn: row.job_alert_opt_in ?? false,
    followDigestFrequency: row.follow_digest_frequency ?? "none",
    forumInterests: row.forum_interests ?? [],
    discoveryRadius: mapDiscoveryRadius(row),
    createdAt: row.created_at,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

function parseServices(raw: unknown): BusinessService[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is BusinessService =>
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        typeof (item as BusinessService).name === "string",
    )
    .map((item) => ({
      ...item,
      actionType:
        item.actionType ?? (item.actionUrl ? ("link" as const) : undefined),
    }));
}

export function mapBusiness(
  row: BusinessRow,
  followerIds: string[] = [],
  followingIds: string[] = [],
): BusinessProfile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory ?? "",
    city: row.city,
    state: row.state,
    county: row.county ?? "",
    zipCode: row.zip_code ?? "",
    country: row.country ?? "US",
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    website: row.website ?? undefined,
    socialLinks: parseSocialLinks(row.social_links),
    phone: row.phone ?? "",
    hours: row.hours ?? "",
    importantInfo: row.important_info ?? "",
    isHiring: row.is_hiring ?? false,
    jobTitle: row.job_title ?? "",
    jobDescription: row.job_description ?? "",
    jobRequirements: row.job_requirements ?? "",
    jobApplicationForm: parseJobApplicationForm(row.job_application_form),
    services: parseServices(row.services),
    mediaUrls: row.media_urls ?? [],
    likeCount: row.like_count ?? 0,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: row.rating_count ?? 0,
    intents: row.intents ?? [],
    followerIds,
    followingIds,
    virtualAgentEnabled: row.virtual_agent_enabled ?? false,
    createdAt: row.created_at,
  };
}

export function mapPost(
  row: PostRow,
  commentIds: string[] = [],
  extras: { likeCount?: number; likedByViewer?: boolean } = {},
): ForumPost {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const business = profile?.businesses
    ? Array.isArray(profile.businesses) ? profile.businesses[0] : profile.businesses
    : null;

  return {
    id: row.id,
    authorId: row.author_id,
    authorName: profileName(row.profiles),
    authorAvatarUrl: profile?.avatar_url ?? undefined,
    businessId: business?.id ?? undefined,
    category: row.category,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url ?? undefined,
    commentIds,
    likeCount: extras.likeCount,
    likedByViewer: extras.likedByViewer,
    createdAt: row.created_at,
  };
}

export function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorName: profileName(row.profiles),
    body: row.body,
    createdAt: row.created_at,
  };
}

export function mapCollaboration(row: CollaborationRow): CollaborationIdea {
  const business = collaborationBusinessMeta(row.businesses);
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: profileName(row.profiles),
    authorAvatarUrl: profileAvatar(row.profiles),
    businessId: row.business_id ?? undefined,
    businessName: business.name,
    businessCategory: business.category,
    businessMediaUrl: business.mediaUrl,
    businessRatingAvg: business.ratingAvg,
    businessRatingCount: business.ratingCount,
    title: row.title,
    summary: row.summary,
    requirements: row.requirements ?? undefined,
    deadline: row.deadline ?? undefined,
    attachmentUrls: row.attachment_urls ?? [],
    lookingFor: row.looking_for,
    location: row.location,
    collaborationType:
      row.collaboration_type === "contract" || row.collaboration_type === "b2b_sale"
        ? row.collaboration_type
        : "proposal",
    status: row.status,
    interestedCount: 0,
    createdAt: row.created_at,
  };
}

export type {
  ProfileRow,
  BusinessRow,
  PostRow,
  CommentRow,
  CollaborationRow,
};
