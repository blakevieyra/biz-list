import type {
  BusinessIntent,
  BusinessProfile,
  CollaborationIdea,
  Comment,
  ForumCategory,
  ForumPost,
  UserProfile,
  UserRole,
  PlanTier,
} from "@/lib/types";

type ProfileRow = {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  plan_tier?: PlanTier;
  bio: string;
  city: string;
  state: string;
  forum_interests: ForumCategory[];
  interest_tags?: string[];
  created_at: string;
};

type BusinessRow = {
  id: string;
  owner_id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  city: string;
  state: string;
  website: string | null;
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
    interestTags: row.interest_tags ?? [],
    createdAt: row.created_at,
  };
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
    city: row.city,
    state: row.state,
    website: row.website ?? undefined,
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
