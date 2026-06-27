import { createClient } from "@/lib/supabase/server";
import {
  getBusinessPostsForBusiness,
  getBusinessReviewsForBusiness,
  getBusinessPostCommentsForPost,
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
  DiscoveryRadius,
  JobApplication,
  JobApplicationComment,
  MileRadius,
  ServiceOrder,
  WorkGroup,
} from "@/lib/types";
import { parsePostType } from "@/lib/media/post-media";
import { getCommentLikeCounts, getPostLikeCounts, getPostLikedByViewer } from "@/lib/data/content-likes";
import { parseFormAnswers } from "@/lib/job-application-form";
import {
  matchesDiscoveryRadius,
  type DiscoveryViewer,
} from "@/lib/feed/location-scope";
import { filterByDiscoveryRadius } from "@/lib/geo/location-coords";


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
    likedByViewer: extras.likedByViewer,
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

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  parent_id?: string | null;
  attachment_url?: string | null;
  profiles?: CommentProfileRow | CommentProfileRow[] | null;
};

type CommentProfileRow = {
  display_name: string;
  avatar_url?: string | null;
  created_at?: string;
};

const COMMENT_SELECT =
  "id, post_id, author_id, body, created_at, parent_id, attachment_url, profiles(display_name, avatar_url, created_at)";

/** Max comments loaded per post in feed/listing views (counts stay accurate). */
const MAX_COMMENTS_PER_POST = 40;

function commentProfileFromJoin(
  profiles: CommentProfileRow | CommentProfileRow[] | null | undefined,
): CommentProfileRow | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

function mapCommentRow(c: CommentRow, ownerId: string): BusinessPostComment {
  const profile = commentProfileFromJoin(c.profiles);
  return {
    id: c.id,
    authorId: c.author_id,
    authorName: profile?.display_name ?? authorName(c.profiles),
    authorAvatarUrl: profile?.avatar_url ?? null,
    memberSince: profile?.created_at,
    body: c.body,
    createdAt: c.created_at,
    isOwnerReply: c.author_id === ownerId,
    parentId: c.parent_id ?? null,
    attachmentUrl: c.attachment_url ?? null,
  };
}

function buildRecentCommentsMap(
  comments: CommentRow[] | null | undefined,
  ownerByPostId: Map<string, string>,
): { countMap: Map<string, number>; recentMap: Map<string, BusinessPostComment[]> } {
  const countMap = new Map<string, number>();
  const grouped = new Map<string, BusinessPostComment[]>();

  for (const c of comments ?? []) {
    countMap.set(c.post_id, (countMap.get(c.post_id) ?? 0) + 1);
    const ownerId = ownerByPostId.get(c.post_id) ?? "";
    const list = grouped.get(c.post_id) ?? [];
    list.push(mapCommentRow(c, ownerId));
    grouped.set(c.post_id, list);
  }

  const recentMap = new Map<string, BusinessPostComment[]>();
  for (const [postId, list] of grouped) {
    list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    recentMap.set(
      postId,
      list.length > MAX_COMMENTS_PER_POST ? list.slice(-MAX_COMMENTS_PER_POST) : list,
    );
  }

  return { countMap, recentMap };
}

async function enrichCommentsWithLikes(
  recentMap: Map<string, BusinessPostComment[]>,
  userId: string | null,
): Promise<Map<string, BusinessPostComment[]>> {
  const allComments = [...recentMap.values()].flat();
  const { counts, likedByViewer } = await getCommentLikeCounts(
    allComments.map((c) => c.id),
    userId,
  );

  const enriched = new Map<string, BusinessPostComment[]>();
  for (const [postId, list] of recentMap) {
    enriched.set(
      postId,
      list.map((c) => ({
        ...c,
        likeCount: counts.get(c.id) ?? 0,
        likedByViewer: likedByViewer.has(c.id),
      })),
    );
  }
  return enriched;
}

export async function getBusinessPosts(
  businessId: string,
  userId: string | null = null,
): Promise<BusinessPost[]> {
  const supabase = await createClient();
  if (!supabase) return getBusinessPostsForBusiness(businessId);

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  const ownerId = businessRow?.owner_id ?? "";

  const { data: rows } = await supabase
    .from("business_posts")
    .select("*, profiles(display_name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!rows?.length) return getBusinessPostsForBusiness(businessId);

  const postIds = rows.map((r) => r.id);
  const { data: comments } = await supabase
    .from("business_post_comments")
    .select(COMMENT_SELECT)
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  const { countMap, recentMap } = buildRecentCommentsMap(
    comments as CommentRow[] | null,
    new Map(postIds.map((id) => [id, ownerId])),
  );
  const enrichedComments = await enrichCommentsWithLikes(recentMap, userId);

  const likeCounts = await getPostLikeCounts(postIds);

  return (rows as BusinessPostRow[]).map((row) =>
    mapPostRow(row, {
      commentCount: countMap.get(row.id) ?? 0,
      likeCount: likeCounts.get(row.id) ?? 0,
      recentComments: enrichedComments.get(row.id) ?? [],
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
    .select("*, profiles(display_name), businesses(name, category, media_urls)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];

  return ((rows as (BusinessPostRow & {
    businesses?: { name: string; category: string; media_urls?: string[] } | { name: string; category: string; media_urls?: string[] }[] | null;
  })[] | null) ?? []).map((row) => {
    const business = row.businesses;
    const businessMeta = Array.isArray(business) ? business[0] : business;
    return mapPostRow(row, {
      businessName: businessMeta?.name,
      businessCategory: businessMeta?.category,
      businessMediaUrl: businessMeta?.media_urls?.[0],
      commentCount: 0,
    });
  });
}

export async function getTrendingBusinessPosts(limit = 10): Promise<BusinessPost[]> {
  const supabase = await createClient();
  if (!supabase) return SEED_BUSINESS_POSTS.filter((p) => p.isTrending).slice(0, limit);

  const { data: rows } = await supabase
    .from("business_posts")
    .select("*, profiles(display_name), businesses(name, category, media_urls)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];

  return ((rows as (BusinessPostRow & {
    businesses?: { name: string; category: string; media_urls?: string[] } | { name: string; category: string; media_urls?: string[] }[] | null;
  })[] | null) ?? []).map((row) => {
    const business = row.businesses;
    const businessMeta = Array.isArray(business) ? business[0] : business;
    return mapPostRow(row, {
      businessName: businessMeta?.name,
      businessCategory: businessMeta?.category,
      businessMediaUrl: businessMeta?.media_urls?.[0],
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
  owner_id?: string;
  city: string;
  state: string;
  zip_code?: string;
  county?: string;
  country?: string;
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
  discoveryRadius?: DiscoveryRadius;
  userId?: string | null;
  postTypes?: BusinessPostType[];
  limit?: number;
}): Promise<BusinessPost[]> {
  const limit = options.limit ?? 40;
  const viewer = options.viewer;
  const discoveryRadius = options.discoveryRadius ?? options.mileRadius ?? options.areaScope ?? "city";
  const typeSet = options.postTypes ? new Set(options.postTypes) : null;

  const supabase = await createClient();

  if (!supabase) {
    let posts = [...SEED_BUSINESS_POSTS];
    if (typeSet) posts = posts.filter((p) => typeSet.has(p.postType));

    const candidates: BusinessPost[] = [];
    for (const post of posts) {
      const business = SEED_BUSINESSES.find((b) => b.id === post.businessId);
      if (!business) continue;

      const isFollowed = options.userId
        ? business.followerIds.includes(options.userId)
        : false;
      candidates.push({
        ...post,
        businessName: business.name,
        businessCategory: business.category,
        businessMediaUrl: business.mediaUrls[0],
        businessRatingAvg: business.ratingAvg,
        businessRatingCount: business.ratingCount,
        businessLikeCount: business.likeCount,
        businessFollowerCount: business.followerIds.length,
        isFollowed,
        recentComments: getBusinessPostCommentsForPost(post.id, business.ownerId),
        commentCount:
          getBusinessPostCommentsForPost(post.id, business.ownerId).length ||
          post.commentCount,
        feedBadge: assignFeedBadge(
          { ...post, isFollowed },
          business.likeCount,
          business.ratingAvg,
          business.ratingCount,
        ),
      });
    }

    if (viewer) {
      const businessById = new Map(SEED_BUSINESSES.map((b) => [b.id, b]));
      const filtered: BusinessPost[] = [];
      for (const post of candidates) {
        const business = businessById.get(post.businessId);
        if (!business) continue;
        const [match] = await filterByDiscoveryRadius([business], viewer, discoveryRadius);
        if (match) filtered.push(post);
      }
      return sortFeedPosts(filtered).slice(0, limit);
    }

    return sortFeedPosts(candidates).slice(0, limit);
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
      "*, profiles(display_name), businesses(name, category, media_urls, like_count, rating_avg, rating_count, owner_id, city, state, zip_code, county, country, latitude, longitude)",
    )
    .not("business_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 3, 60));

  if (typeSet) {
    query = query.in("post_type", [...typeSet]);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const filteredRows: (BusinessPostRow & {
    businesses?: FeedBusinessMeta | FeedBusinessMeta[] | null;
  })[] = [];

  for (const row of rows as (BusinessPostRow & {
    businesses?: FeedBusinessMeta | FeedBusinessMeta[] | null;
  })[]) {
    const meta = businessMetaFromRow(row.businesses);
    if (!meta) continue;
    if (!viewer) {
      filteredRows.push(row);
      continue;
    }
    const location = {
      city: meta.city,
      state: meta.state,
      county: meta.county ?? "",
      zipCode: meta.zip_code ?? "",
      country: meta.country ?? "US",
      latitude: meta.latitude ?? undefined,
      longitude: meta.longitude ?? undefined,
    };
    const [match] = await filterByDiscoveryRadius([location], viewer, discoveryRadius);
    if (match) filteredRows.push(row);
  }

  const postIds = filteredRows.slice(0, limit).map((r) => r.id);
  const ownerByPostId = new Map(
    filteredRows.slice(0, limit).map((row) => {
      const meta = businessMetaFromRow(row.businesses);
      return [row.id, meta?.owner_id ?? row.author_id] as const;
    }),
  );

  const { data: comments } = await supabase
    .from("business_post_comments")
    .select(COMMENT_SELECT)
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  const { countMap, recentMap } = buildRecentCommentsMap(
    comments as CommentRow[] | null,
    ownerByPostId,
  );
  const enrichedComments = await enrichCommentsWithLikes(recentMap, options.userId ?? null);

  const likeCounts = await getPostLikeCounts(postIds);
  const likedPosts = await getPostLikedByViewer(postIds, options.userId ?? null);

  const uniqueBusinessIds = [...new Set(filteredRows.slice(0, limit).map((r) => r.business_id))];
  const { data: followRows } = await supabase
    .from("business_follows")
    .select("business_id")
    .in("business_id", uniqueBusinessIds);
  const followerCountMap = new Map<string, number>();
  for (const f of followRows ?? []) {
    followerCountMap.set(f.business_id, (followerCountMap.get(f.business_id) ?? 0) + 1);
  }

  const posts = filteredRows.slice(0, limit).map((row) => {
    const meta = businessMetaFromRow(row.businesses);
    const isFollowed = followedIds.has(row.business_id);
    const businessLikeCount = meta?.like_count ?? 0;
    const businessFollowerCount = followerCountMap.get(row.business_id) ?? 0;
    const businessRatingAvg = Number(meta?.rating_avg ?? 0);
    const businessRatingCount = meta?.rating_count ?? 0;
    const base = mapPostRow(row, {
      businessName: meta?.name,
      businessCategory: meta?.category,
      businessMediaUrl: meta?.media_urls?.[0],
      businessRatingAvg,
      businessRatingCount,
      businessLikeCount,
      businessFollowerCount,
      commentCount: countMap.get(row.id) ?? 0,
      likeCount: likeCounts.get(row.id) ?? 0,
      likedByViewer: likedPosts.has(row.id),
      recentComments: enrichedComments.get(row.id) ?? [],
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
  cover_letter?: string;
  resume_snapshot?: string;
  resume_file_url?: string;
  form_answers?: unknown;
  resume_attached?: boolean;
  status: JobApplication["status"];
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
  businesses?: { name: string; owner_id: string } | { name: string; owner_id: string }[] | null;
};

function mapJobApplicationRow(row: JobApplicationRow): JobApplication {
  const business = row.businesses;
  const businessMeta = Array.isArray(business) ? business[0] : business;
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: businessMeta?.name,
    applicantId: row.applicant_id,
    applicantName: authorName(row.profiles),
    message: row.message,
    coverLetter: row.cover_letter ?? "",
    resumeSnapshot: row.resume_snapshot ?? "",
    resumeFileUrl: row.resume_file_url ?? undefined,
    resumeAttached: row.resume_attached ?? Boolean(row.resume_snapshot),
    formAnswers: parseFormAnswers(row.form_answers),
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getExistingJobApplication(
  businessId: string,
  applicantId: string,
): Promise<JobApplication | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("job_applications")
    .select("*, profiles(display_name), businesses(name, owner_id)")
    .eq("business_id", businessId)
    .eq("applicant_id", applicantId)
    .maybeSingle();

  if (!row) return null;
  return mapJobApplicationRow(row as JobApplicationRow);
}

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
    .select("*, profiles(display_name), businesses(name, owner_id)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return ((rows as JobApplicationRow[] | null) ?? []).map(mapJobApplicationRow);
}

export async function getJobApplicationsForApplicant(
  applicantId: string,
): Promise<JobApplication[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: rows } = await supabase
    .from("job_applications")
    .select("*, profiles(display_name), businesses(name, owner_id)")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false });

  return ((rows as JobApplicationRow[] | null) ?? []).map(mapJobApplicationRow);
}

export async function getJobApplicationById(
  applicationId: string,
  userId: string,
): Promise<(JobApplication & { ownerId: string }) | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("job_applications")
    .select("*, profiles(display_name), businesses(name, owner_id)")
    .eq("id", applicationId)
    .maybeSingle();

  if (!row) return null;

  const typed = row as JobApplicationRow;
  const business = typed.businesses;
  const businessMeta = Array.isArray(business) ? business[0] : business;
  const ownerId = businessMeta?.owner_id ?? "";
  if (typed.applicant_id !== userId && ownerId !== userId) return null;

  return { ...mapJobApplicationRow(typed), ownerId };
}

type JobApplicationCommentRow = {
  id: string;
  application_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

export async function getJobApplicationComments(
  applicationId: string,
  ownerId: string,
): Promise<JobApplicationComment[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: rows } = await supabase
    .from("job_application_comments")
    .select("id, application_id, author_id, body, created_at, profiles(display_name)")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  return ((rows as JobApplicationCommentRow[] | null) ?? []).map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorName: authorName(row.profiles),
    body: row.body,
    createdAt: row.created_at,
    isOwnerReply: row.author_id === ownerId,
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
