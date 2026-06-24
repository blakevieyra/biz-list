import { createClient } from "@/lib/supabase/server";
import {
  getBusinessPostsForBusiness,
  getBusinessReviewsForBusiness,
  SEED_BUSINESSES,
  SEED_BUSINESS_POSTS,
} from "@/lib/mock-data";
import type {
  AreaScope,
  BusinessPost,
  BusinessPostComment,
  BusinessPostType,
  BusinessReview,
  BusinessService,
  JobApplication,
  MileRadius,
  ServiceOrder,
  WorkGroup,
} from "@/lib/types";
import { parsePostType } from "@/lib/media/post-media";
import { getPostLikeCounts } from "@/lib/data/content-likes";
import {
  matchesAreaScope,
  matchesMileRadius,
  type DiscoveryViewer,
} from "@/lib/feed/location-scope";


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
    businessMediaUrl: extras.businessMediaUrl,
    businessRatingAvg: extras.businessRatingAvg,
    businessRatingCount: extras.businessRatingCount,
    businessLikeCount: extras.businessLikeCount,
    isFollowed: extras.isFollowed,
    feedBadge: extras.feedBadge,
    recentComments: extras.recentComments,
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

type FeedBusinessMeta = {
  name: string;
  category: string;
  media_urls?: string[];
  like_count?: number;
  rating_avg?: number;
  rating_count?: number;
  city: string;
  state: string;
  zip_code?: string;
  county?: string;
  latitude?: number | null;
  longitude?: number | null;
};

function businessMetaFromRow(
  raw: FeedBusinessMeta | FeedBusinessMeta[] | null | undefined,
): FeedBusinessMeta | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function assignFeedBadge(
  post: BusinessPost,
  businessLikeCount: number,
  businessRatingAvg: number,
  businessRatingCount: number,
): BusinessPost["feedBadge"] {
  if (post.isFollowed) return "following";
  if (post.isTrending) return "trending";
  if (businessRatingCount >= 3 && businessRatingAvg >= 4.5) return "top-rated";
  if (businessLikeCount >= 8) return "popular";
  return undefined;
}

function sortFeedPosts(posts: BusinessPost[]): BusinessPost[] {
  return [...posts].sort((a, b) => {
    if (Boolean(a.isFollowed) !== Boolean(b.isFollowed)) {
      return a.isFollowed ? -1 : 1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getFeedBusinessPosts(options: {
  viewer?: DiscoveryViewer | null;
  areaScope?: AreaScope;
  mileRadius?: MileRadius;
  userId?: string | null;
  postTypes?: BusinessPostType[];
  limit?: number;
}): Promise<BusinessPost[]> {
  const limit = options.limit ?? 40;
  const viewer = options.viewer;
  const areaScope = options.areaScope ?? "city";
  const mileRadius = options.mileRadius;
  const typeSet = options.postTypes ? new Set(options.postTypes) : null;

  const supabase = await createClient();

  if (!supabase) {
    let posts = [...SEED_BUSINESS_POSTS];
    if (typeSet) posts = posts.filter((p) => typeSet.has(p.postType));
    posts = posts.map((post) => {
      const business = SEED_BUSINESSES.find((b) => b.id === post.businessId);
      if (!business) return post;
      if (viewer) {
        if (!matchesAreaScope(viewer, business, areaScope)) return null;
        if (mileRadius && !matchesMileRadius(viewer, business, mileRadius)) return null;
      }
      const isFollowed = options.userId
        ? business.followerIds.includes(options.userId)
        : false;
      const enriched: BusinessPost = {
        ...post,
        businessName: business.name,
        businessCategory: business.category,
        businessMediaUrl: business.mediaUrls[0],
        businessRatingAvg: business.ratingAvg,
        businessRatingCount: business.ratingCount,
        businessLikeCount: business.likeCount,
        isFollowed,
        feedBadge: assignFeedBadge(
          { ...post, isFollowed },
          business.likeCount,
          business.ratingAvg,
          business.ratingCount,
        ),
      };
      return enriched;
    }).filter((p): p is BusinessPost => p !== null);

    return sortFeedPosts(posts).slice(0, limit);
  }

  let followedIds = new Set<string>();
  if (options.userId) {
    const { data: follows } = await supabase
      .from("business_follows")
      .select("business_id")
      .eq("follower_id", options.userId);
    followedIds = new Set((follows ?? []).map((f) => f.business_id));
  }

  let query = supabase
    .from("business_posts")
    .select(
      "*, profiles(display_name), businesses(name, category, media_urls, like_count, rating_avg, rating_count, city, state, zip_code, county, latitude, longitude)",
    )
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 3, 60));

  if (typeSet) {
    query = query.in("post_type", [...typeSet]);
  }

  const { data: rows } = await query;
  if (!rows?.length) return sortFeedPosts(SEED_BUSINESS_POSTS.slice(0, limit));

  const filteredRows = (rows as (BusinessPostRow & { businesses?: FeedBusinessMeta | FeedBusinessMeta[] | null })[]).filter(
    (row) => {
      const meta = businessMetaFromRow(row.businesses);
      if (!meta || !viewer) return true;
      const location = {
        city: meta.city,
        state: meta.state,
        county: meta.county ?? "",
        zipCode: meta.zip_code ?? "",
        latitude: meta.latitude ?? undefined,
        longitude: meta.longitude ?? undefined,
      };
      if (!matchesAreaScope(viewer, location, areaScope)) return false;
      if (mileRadius && !matchesMileRadius(viewer, location, mileRadius)) return false;
      return true;
    },
  );

  const postIds = filteredRows.slice(0, limit).map((r) => r.id);
  const { data: comments } = await supabase
    .from("business_post_comments")
    .select("id, post_id, body, created_at, profiles(display_name)")
    .in("post_id", postIds)
    .order("created_at", { ascending: false });

  const commentCountMap = new Map<string, number>();
  const recentCommentsMap = new Map<string, BusinessPostComment[]>();
  for (const c of comments ?? []) {
    commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) ?? 0) + 1);
    const list = recentCommentsMap.get(c.post_id) ?? [];
    if (list.length < 2) {
      list.push({
        id: c.id,
        authorName: authorName(c.profiles),
        body: c.body,
        createdAt: c.created_at,
      });
      recentCommentsMap.set(c.post_id, list);
    }
  }

  const likeCounts = await getPostLikeCounts(postIds);

  const posts = filteredRows.slice(0, limit).map((row) => {
    const meta = businessMetaFromRow(row.businesses);
    const isFollowed = followedIds.has(row.business_id);
    const businessLikeCount = meta?.like_count ?? 0;
    const businessRatingAvg = Number(meta?.rating_avg ?? 0);
    const businessRatingCount = meta?.rating_count ?? 0;
    const base = mapPostRow(row, {
      businessName: meta?.name,
      businessCategory: meta?.category,
      businessMediaUrl: meta?.media_urls?.[0],
      businessRatingAvg,
      businessRatingCount,
      businessLikeCount,
      commentCount: commentCountMap.get(row.id) ?? 0,
      likeCount: likeCounts.get(row.id) ?? 0,
      recentComments: recentCommentsMap.get(row.id) ?? [],
      isFollowed,
    });
    return {
      ...base,
      feedBadge: assignFeedBadge(base, businessLikeCount, businessRatingAvg, businessRatingCount),
    };
  });

  return sortFeedPosts(posts);
}

export async function getLatestPostsForBusinessIds(
  businessIds: string[],
  limitPerBusiness = 3,
): Promise<Map<string, BusinessPost[]>> {
  const map = new Map<string, BusinessPost[]>();
  if (!businessIds.length) return map;

  const supabase = await createClient();
  if (!supabase) {
    for (const id of businessIds) {
      const posts = getBusinessPostsForBusiness(id).slice(0, limitPerBusiness);
      if (posts.length) map.set(id, posts);
    }
    return map;
  }

  const { data: rows } = await supabase
    .from("business_posts")
    .select("*, profiles(display_name)")
    .in("business_id", businessIds)
    .order("created_at", { ascending: false });

  const selectedRows: BusinessPostRow[] = [];
  const perBusinessCount = new Map<string, number>();

  for (const row of (rows as BusinessPostRow[] | null) ?? []) {
    const count = perBusinessCount.get(row.business_id) ?? 0;
    if (count >= limitPerBusiness) continue;
    selectedRows.push(row);
    perBusinessCount.set(row.business_id, count + 1);
  }

  if (!selectedRows.length) return map;

  const postIds = selectedRows.map((r) => r.id);
  const { data: comments } = await supabase
    .from("business_post_comments")
    .select("post_id")
    .in("post_id", postIds);

  const commentCountMap = new Map<string, number>();
  for (const c of comments ?? []) {
    commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) ?? 0) + 1);
  }

  const likeCounts = await getPostLikeCounts(postIds);

  for (const row of selectedRows) {
    const post = mapPostRow(row, {
      commentCount: commentCountMap.get(row.id) ?? 0,
      likeCount: likeCounts.get(row.id) ?? 0,
    });
    const list = map.get(row.business_id) ?? [];
    list.push(post);
    map.set(row.business_id, list);
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
