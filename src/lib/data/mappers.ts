import type {
  BusinessIntent,
  BusinessProfile,
  BusinessService,
  BusinessSocialLinks,
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
import type { AreaScope } from "@/lib/types";

type ProfileRow = {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  plan_tier?: PlanTier;
  bio: string;
  city: string;
  state: string;
  county?: string;
  zip_code?: string;
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
  target_job_titles?: string[];
  job_alert_opt_in?: boolean;
  follow_digest_frequency?: "none" | "daily" | "weekly" | "monthly";
  feed_scope?: "local" | "state" | "nationwide";
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
  latitude?: number | null;
  longitude?: number | null;
  website: string | null;
  social_links?: unknown;
  phone?: string;
  hours?: string;
  important_info?: string;
  is_hiring?: boolean;
  services?: unknown;
  media_urls?: string[];
  like_count?: number;
  rating_avg?: number;
  rating_count?: number;
  intents: BusinessIntent[];
  created_at: string;
};

type PostRow = {
  id: string;
  author_id: string;
  category: ForumCategory;
  title: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
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
  status: CollaborationIdea["status"];
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

function profileName(
  profiles: { display_name: string } | { display_name: string }[] | null | undefined,
): string {
  if (!profiles) return "Unknown";
  if (Array.isArray(profiles)) return profiles[0]?.display_name ?? "Unknown";
  return profiles.display_name;
}

export function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    planTier: row.plan_tier ?? "free",
    bio: row.bio,
    city: row.city,
    state: row.state,
    county: row.county ?? "",
    zipCode: row.zip_code ?? "",
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    interestTags: row.interest_tags ?? [],
    industryInterests: row.industry_interests ?? [],
    headline: row.headline ?? "",
    skills: row.skills ?? [],
    isSeekingWork: row.is_seeking_work ?? false,
    experienceText: row.experience_text ?? "",
    resumeText: row.resume_text ?? "",
    targetJobTitles: row.target_job_titles ?? [],
    jobAlertOptIn: row.job_alert_opt_in ?? false,
    followDigestFrequency: row.follow_digest_frequency ?? "none",
    forumInterests: row.forum_interests ?? [],
    discoveryRadius: mapDiscoveryRadius(row),
    feedScope: mapDiscoveryRadius(row),
    createdAt: row.created_at,
  };
}

function parseSocialLinks(raw: unknown): BusinessSocialLinks {
  if (!raw || typeof raw !== "object") return {};
  const links = raw as Record<string, unknown>;
  const pick = (key: keyof BusinessSocialLinks) =>
    typeof links[key] === "string" ? links[key] : undefined;
  return {
    instagram: pick("instagram"),
    facebook: pick("facebook"),
    linkedin: pick("linkedin"),
    x: pick("x"),
    tiktok: pick("tiktok"),
    youtube: pick("youtube"),
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
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    website: row.website ?? undefined,
    socialLinks: parseSocialLinks(row.social_links),
    phone: row.phone ?? "",
    hours: row.hours ?? "",
    importantInfo: row.important_info ?? "",
    isHiring: row.is_hiring ?? false,
    services: parseServices(row.services),
    mediaUrls: row.media_urls ?? [],
    likeCount: row.like_count ?? 0,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: row.rating_count ?? 0,
    intents: row.intents ?? [],
    followerIds,
    followingIds,
    createdAt: row.created_at,
  };
}

export function mapPost(row: PostRow, commentIds: string[] = []): ForumPost {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: profileName(row.profiles),
    category: row.category,
    title: row.title,
    body: row.body,
    commentIds,
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
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: profileName(row.profiles),
    businessId: row.business_id ?? undefined,
    title: row.title,
    summary: row.summary,
    lookingFor: row.looking_for,
    location: row.location,
    status: row.status,
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
