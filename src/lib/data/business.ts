import { createClient } from "@/lib/supabase/server";
import {
  getBusinessPostsForBusiness,
  getBusinessReviewsForBusiness,
  SEED_BUSINESS_POSTS,
} from "@/lib/mock-data";
import type {
  BusinessPost,
  BusinessReview,
  BusinessService,
  JobApplication,
  ServiceOrder,
  WorkGroup,
} from "@/lib/types";
import { parsePostType } from "@/lib/media/post-media";
import { getPostLikeCounts } from "@/lib/data/content-likes";


type BusinessPostRow = {
  id: string;
  business_id: string;
  author_id: string;
  post_type?: string;
  title: string;
  body: string;
  media_urls: string[];
  engagement_score: number;
  is_trending: boolean;
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

function mapPostRow(
  row: BusinessPostRow,
  extras: Partial<BusinessPost> = {},
): BusinessPost {
  return {
    id: row.id,
    businessId: row.business_id,
    authorId: row.author_id,
    authorName: authorName(row.profiles),
    postType: parsePostType(row.post_type),
    title: row.title,
    body: row.body,
    mediaUrls: row.media_urls ?? [],
    engagementScore: row.engagement_score,
    isTrending: row.is_trending,
    commentCount: extras.commentCount ?? 0,
    likeCount: extras.likeCount ?? 0,
    createdAt: row.created_at,
    businessName: extras.businessName,
    businessCategory: extras.businessCategory,
  };
}

type ReviewRow = {
  id: string;
  business_id: string;
  author_id: string;
  rating: number;
  body: string;
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

type WorkGroupRow = {
  id: string;
  creator_id: string;
  business_id: string | null;
  title: string;
  focus_area: string;
  description: string;
  location: string;
  status: string;
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

function authorName(
  profiles: { display_name: string } | { display_name: string }[] | null | undefined,
): string {
  if (!profiles) return "Unknown";
  if (Array.isArray(profiles)) return profiles[0]?.display_name ?? "Unknown";
  return profiles.display_name;
}

export async function getBusinessPosts(businessId: string): Promise<BusinessPost[]> {
  const supabase = await createClient();
  if (!supabase) return getBusinessPostsForBusiness(businessId);

  const { data: rows } = await supabase
    .from("business_posts")
    .select("*, profiles(display_name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!rows?.length) return getBusinessPostsForBusiness(businessId);

  const postIds = rows.map((r) => r.id);
  const { data: comments } = await supabase
    .from("business_post_comments")
    .select("post_id")
    .in("post_id", postIds);

  const countMap = new Map<string, number>();
  for (const c of comments ?? []) {
    countMap.set(c.post_id, (countMap.get(c.post_id) ?? 0) + 1);
  }

  const likeCounts = await getPostLikeCounts(postIds);

  return (rows as BusinessPostRow[]).map((row) =>
    mapPostRow(row, {
      commentCount: countMap.get(row.id) ?? 0,
      likeCount: likeCounts.get(row.id) ?? 0,
    }),
  );
}

export async function getBusinessReviews(businessId: string): Promise<BusinessReview[]> {
  const supabase = await createClient();
  if (!supabase) return getBusinessReviewsForBusiness(businessId);

  const { data: rows } = await supabase
    .from("business_reviews")
    .select("*, profiles(display_name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!rows?.length) return getBusinessReviewsForBusiness(businessId);

  return ((rows as ReviewRow[] | null) ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    authorId: row.author_id,
    authorName: authorName(row.profiles),
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function getRecentListingsPosts(limit = 12): Promise<BusinessPost[]> {
  const supabase = await createClient();
  if (!supabase) return SEED_BUSINESS_POSTS.slice(0, limit);

  const { data: rows } = await supabase
    .from("business_posts")
    .select("*, profiles(display_name), businesses(name, category)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return SEED_BUSINESS_POSTS.slice(0, limit);

  return ((rows as (BusinessPostRow & {
    businesses?: { name: string; category: string } | { name: string; category: string }[] | null;
  })[] | null) ?? []).map((row) => {
    const business = row.businesses;
    const businessMeta = Array.isArray(business) ? business[0] : business;
    return mapPostRow(row, {
      businessName: businessMeta?.name,
      businessCategory: businessMeta?.category,
      commentCount: 0,
    });
  });
}

export async function getTrendingBusinessPosts(limit = 10): Promise<BusinessPost[]> {
  const supabase = await createClient();
  if (!supabase) return SEED_BUSINESS_POSTS.filter((p) => p.isTrending).slice(0, limit);

  const { data: rows } = await supabase
    .from("business_posts")
    .select("*, profiles(display_name), businesses(name, category)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return SEED_BUSINESS_POSTS.slice(0, limit);

  return ((rows as (BusinessPostRow & {
    businesses?: { name: string; category: string } | { name: string; category: string }[] | null;
  })[] | null) ?? []).map((row) => {
    const business = row.businesses;
    const businessMeta = Array.isArray(business) ? business[0] : business;
    return mapPostRow(row, {
      businessName: businessMeta?.name,
      businessCategory: businessMeta?.category,
      commentCount: 0,
    });
  });
}

export async function getLatestPostsForBusinessIds(
  businessIds: string[],
): Promise<Map<string, BusinessPost>> {
  const map = new Map<string, BusinessPost>();
  if (!businessIds.length) return map;

  const supabase = await createClient();
  if (!supabase) {
    for (const id of businessIds) {
      const posts = getBusinessPostsForBusiness(id);
      if (posts[0]) map.set(id, posts[0]);
    }
    return map;
  }

  const { data: rows } = await supabase
    .from("business_posts")
    .select("*, profiles(display_name)")
    .in("business_id", businessIds)
    .order("created_at", { ascending: false });

  for (const row of (rows as BusinessPostRow[] | null) ?? []) {
    if (!map.has(row.business_id)) {
      map.set(row.business_id, mapPostRow(row));
    }
  }

  const postIds = [...map.values()].map((p) => p.id);
  const likeCounts = await getPostLikeCounts(postIds);
  for (const [businessId, post] of map) {
    map.set(businessId, { ...post, likeCount: likeCounts.get(post.id) ?? 0 });
  }

  return map;
}

type JobApplicationRow = {
  id: string;
  business_id: string;
  applicant_id: string;
  message: string;
  status: JobApplication["status"];
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

export async function getJobApplicationsForBusiness(
  businessId: string,
  ownerId: string,
): Promise<JobApplication[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: business } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .single();

  if (!business || business.owner_id !== ownerId) return [];

  const { data: rows } = await supabase
    .from("job_applications")
    .select("*, profiles(display_name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return ((rows as JobApplicationRow[] | null) ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    applicantId: row.applicant_id,
    applicantName: authorName(row.profiles),
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));
}

type ServiceOrderRow = {
  id: string;
  business_id: string;
  customer_id: string;
  service_name: string;
  message: string;
  quantity: string;
  status: ServiceOrder["status"];
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

export async function getServiceOrdersForBusiness(
  businessId: string,
  ownerId: string,
): Promise<ServiceOrder[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: business } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .single();

  if (!business || business.owner_id !== ownerId) return [];

  const { data: rows } = await supabase
    .from("service_orders")
    .select("*, profiles(display_name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return ((rows as ServiceOrderRow[] | null) ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    customerName: authorName(row.profiles),
    serviceName: row.service_name,
    message: row.message,
    quantity: row.quantity,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getWorkGroups(): Promise<WorkGroup[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: rows } = await supabase
    .from("work_groups")
    .select("*, profiles(display_name)")
    .order("created_at", { ascending: false });

  return ((rows as WorkGroupRow[] | null) ?? []).map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    creatorName: authorName(row.profiles),
    businessId: row.business_id ?? undefined,
    title: row.title,
    focusArea: row.focus_area,
    description: row.description,
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getMarketingCampaigns(userId: string) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export function parseServices(raw: unknown): BusinessService[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is BusinessService =>
      typeof item === "object" &&
      item !== null &&
      "name" in item &&
      typeof (item as BusinessService).name === "string",
  ).map((item) => ({
    ...item,
    actionType:
      (item as BusinessService).actionType ??
      ((item as BusinessService).actionUrl ? "link" : undefined),
  }));
}
