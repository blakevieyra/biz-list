import {
  SEED_BUSINESSES,
  SEED_COLLABORATIONS,
  SEED_COMMENTS,
  SEED_POSTS,
  SEED_USERS,
} from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessConnectionState,
  BusinessIntent,
  BusinessProfile,
  CollaborationIdea,
  Comment,
  ForumCategory,
  ForumPost,
  Notification,
  UserProfile,
} from "@/lib/types";
import {
  businessDiscoveryScore,
  matchesFeedScope,
  type DiscoveryViewer,
  type FeedScope,
  type LocationProfile,
  DEFAULT_DISCOVERY_RADIUS,
} from "@/lib/feed/location-scope";
import {
  mapBusiness,
  mapCollaboration,
  mapComment,
  mapPost,
  mapProfile,
  type BusinessRow,
  type CollaborationRow,
  type CommentRow,
  type PostRow,
  type ProfileRow,
} from "./mappers";

async function getSupabase() {
  return createClient();
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ? mapProfile(data as ProfileRow) : null;
}

export async function getProfileById(id: string): Promise<UserProfile | null> {
  const supabase = await getSupabase();
  if (!supabase) return SEED_USERS.find((u) => u.id === id) ?? null;

  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  return data ? mapProfile(data as ProfileRow) : null;
}

export async function getBusinessByOwnerId(ownerId: string): Promise<BusinessProfile | null> {
  const supabase = await getSupabase();
  if (!supabase) {
    return SEED_BUSINESSES.find((b) => b.ownerId === ownerId) ?? null;
  }

  const { data: row } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!row) return null;

  const { data: follows } = await supabase
    .from("business_follows")
    .select("follower_id")
    .eq("business_id", row.id);

  const followerIds = (follows ?? []).map((f) => f.follower_id);
  return mapBusiness(row as BusinessRow, followerIds, []);
}

export async function getListingsMembers(filters?: {
  query?: string;
  seekingWork?: boolean;
  scope?: FeedScope;
  viewer?: LocationProfile | null;
}): Promise<UserProfile[]> {
  const supabase = await getSupabase();
  const scope = filters?.scope ?? DEFAULT_DISCOVERY_RADIUS;
  const viewer = filters?.viewer;

  if (!supabase) {
    return SEED_USERS.filter((u) => {
      if (u.role !== "customer") return false;
      if (filters?.seekingWork && !u.isSeekingWork) return false;
      if (viewer && !matchesFeedScope(viewer, u, scope)) return false;
      const q = filters?.query?.toLowerCase() ?? "";
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.bio.toLowerCase().includes(q) ||
        u.headline.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        u.skills.some((s) => s.toLowerCase().includes(q))
      );
    }).sort((a, b) => {
      const scoreA = (a.isSeekingWork ? 10 : 0) + a.skills.length * 2;
      const scoreB = (b.isSeekingWork ? 10 : 0) + b.skills.length * 2;
      return scoreB - scoreA;
    });
  }

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .neq("display_name", "")
    .order("created_at", { ascending: false });

  if (filters?.seekingWork) {
    query = query.eq("is_seeking_work", true);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  let result = (rows as ProfileRow[]).map(mapProfile);

  if (filters?.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.bio.toLowerCase().includes(q) ||
        u.headline.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        u.skills.some((s) => s.toLowerCase().includes(q)),
    );
  }

  if (viewer) {
    result = result.filter((u) => matchesFeedScope(viewer, u, scope));
  }

  return result.sort((a, b) => {
    const scoreA = (a.isSeekingWork ? 10 : 0) + a.skills.length * 2 + (a.headline ? 3 : 0);
    const scoreB = (b.isSeekingWork ? 10 : 0) + b.skills.length * 2 + (b.headline ? 3 : 0);
    return scoreB - scoreA;
  });
}

export async function getCommunityBusinesses(filters?: {
  query?: string;
  scope?: FeedScope;
  viewer?: DiscoveryViewer | null;
  hiringOnly?: boolean;
}): Promise<BusinessProfile[]> {
  const businesses = await getBusinesses({ query: filters?.query, viewer: filters?.viewer });
  const scope = filters?.scope ?? DEFAULT_DISCOVERY_RADIUS;
  const viewer = filters?.viewer;

  let result = businesses;
  if (filters?.hiringOnly) {
    result = result.filter((b) => b.isHiring);
  }
  if (viewer) {
    result = result.filter((b) => matchesFeedScope(viewer, b, scope));
  }

  return result.sort(
    (a, b) => businessDiscoveryScore(b, viewer) - businessDiscoveryScore(a, viewer),
  );
}

export async function getBusinesses(filters?: {
  intent?: BusinessIntent;
  category?: string;
  subcategory?: string;
  query?: string;
  scope?: FeedScope;
  viewer?: DiscoveryViewer | null;
}): Promise<BusinessProfile[]> {
  const supabase = await getSupabase();
  const scope = filters?.scope;
  const viewer = filters?.viewer;

  function rankBusinesses(list: BusinessProfile[]): BusinessProfile[] {
    return [...list].sort(
      (a, b) =>
        businessDiscoveryScore(b, viewer, scope) - businessDiscoveryScore(a, viewer, scope),
    );
  }

  if (!supabase) {
    let result = SEED_BUSINESSES.filter((b) => {
      const matchesIntent = !filters?.intent || b.intents.includes(filters.intent);
      const matchesCategory = !filters?.category || b.category === filters.category;
      const matchesSubcategory =
        !filters?.subcategory || b.subcategory === filters.subcategory;
      const q = filters?.query?.toLowerCase() ?? "";
      const matchesQuery =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.zipCode.includes(q) ||
        b.category.toLowerCase().includes(q) ||
        (b.subcategory?.toLowerCase().includes(q) ?? false);
      return matchesIntent && matchesCategory && matchesSubcategory && matchesQuery;
    });

    if (viewer && scope && scope !== "nationwide") {
      result = result.filter((b) => matchesFeedScope(viewer, b, scope));
    }

    return rankBusinesses(result);
  }

  let query = supabase.from("businesses").select("*").order("created_at", { ascending: false });

  if (filters?.intent) {
    query = query.contains("intents", [filters.intent]);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const businesses = rows as BusinessRow[];
  const ids = businesses.map((b) => b.id);

  const { data: follows } = await supabase
    .from("business_follows")
    .select("follower_id, business_id")
    .in("business_id", ids);

  const followerMap = new Map<string, string[]>();
  for (const f of follows ?? []) {
    const list = followerMap.get(f.business_id) ?? [];
    list.push(f.follower_id);
    followerMap.set(f.business_id, list);
  }

  let result = businesses.map((row) =>
    mapBusiness(row, followerMap.get(row.id) ?? [], []),
  );

  if (filters?.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.zipCode.includes(q) ||
        b.category.toLowerCase().includes(q),
    );
  }

  if (filters?.category) {
    result = result.filter((b) => b.category === filters.category);
  }

  if (filters?.subcategory) {
    result = result.filter((b) => b.subcategory === filters.subcategory);
  }

  if (viewer && scope && scope !== "nationwide") {
    result = result.filter((b) => matchesFeedScope(viewer, b, scope));
  }

  return rankBusinesses(result);
}

export async function getBusinessById(id: string): Promise<BusinessProfile | null> {
  const supabase = await getSupabase();
  if (!supabase) return SEED_BUSINESSES.find((b) => b.id === id) ?? null;

  const { data: row } = await supabase.from("businesses").select("*").eq("id", id).single();
  if (!row) return null;

  const { data: follows } = await supabase
    .from("business_follows")
    .select("follower_id")
    .eq("business_id", id);

  const followerIds = (follows ?? []).map((f) => f.follower_id);

  return mapBusiness(row as BusinessRow, followerIds, []);
}

export async function getBusinessConnectionState(
  businessId: string,
  userId: string | null,
): Promise<BusinessConnectionState> {
  const business = await getBusinessById(businessId);
  const followerCount = business?.followerIds.length ?? 0;

  if (!userId) {
    return {
      isFollowing: false,
      isLiked: false,
      connectionStatus: "none",
      followerCount,
      followingCount: 0,
    };
  }

  const supabase = await getSupabase();
  if (!supabase) {
    return {
      isFollowing: business?.followerIds.includes(userId) ?? false,
      isLiked: false,
      connectionStatus: "none",
      followerCount,
      followingCount: 0,
    };
  }

  const [{ data: follow }, { data: like }, { data: connection }, { count: followingCount }] =
    await Promise.all([
      supabase
        .from("business_follows")
        .select("id")
        .eq("business_id", businessId)
        .eq("follower_id", userId)
        .maybeSingle(),
      supabase
        .from("business_likes")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("business_connections")
        .select("status")
        .eq("business_id", businessId)
        .eq("requester_id", userId)
        .maybeSingle(),
      supabase
        .from("business_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId),
    ]);

  return {
    isFollowing: Boolean(follow),
    isLiked: Boolean(like),
    connectionStatus: connection?.status ?? "none",
    followerCount,
    followingCount: followingCount ?? 0,
  };
}

export async function getForumPosts(category?: ForumCategory): Promise<ForumPost[]> {
  const supabase = await getSupabase();
  if (!supabase) {
    const posts = category
      ? SEED_POSTS.filter((p) => p.category === category)
      : SEED_POSTS;
    return posts;
  }

  let query = supabase
    .from("forum_posts")
    .select("*, profiles(display_name)")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const postIds = rows.map((r) => r.id);
  const { data: commentCounts } = await supabase
    .from("forum_comments")
    .select("post_id")
    .in("post_id", postIds);

  const countMap = new Map<string, number>();
  for (const c of commentCounts ?? []) {
    countMap.set(c.post_id, (countMap.get(c.post_id) ?? 0) + 1);
  }

  return (rows as PostRow[]).map((row) => {
    const count = countMap.get(row.id) ?? 0;
    return mapPost(
      row,
      Array.from({ length: count }, (_, i) => `${row.id}-comment-${i}`),
    );
  });
}

export async function getForumPostById(id: string): Promise<ForumPost | null> {
  const supabase = await getSupabase();
  if (!supabase) return SEED_POSTS.find((p) => p.id === id) ?? null;

  const { data: row } = await supabase
    .from("forum_posts")
    .select("*, profiles(display_name)")
    .eq("id", id)
    .single();

  if (!row) return null;

  const { data: comments } = await supabase
    .from("forum_comments")
    .select("id")
    .eq("post_id", id);

  return mapPost(row as PostRow, (comments ?? []).map((c) => c.id));
}

export async function getCommentsForPost(postId: string): Promise<Comment[]> {
  const supabase = await getSupabase();
  if (!supabase) return SEED_COMMENTS.filter((c) => c.postId === postId);

  const { data: rows } = await supabase
    .from("forum_comments")
    .select("*, profiles(display_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return (rows as CommentRow[] | null)?.map(mapComment) ?? [];
}

export async function getCollaborations(): Promise<CollaborationIdea[]> {
  const supabase = await getSupabase();
  if (!supabase) return SEED_COLLABORATIONS;

  const { data: rows } = await supabase
    .from("collaborations")
    .select("*, profiles(display_name)")
    .order("created_at", { ascending: false });

  return (rows as CollaborationRow[] | null)?.map(mapCollaboration) ?? [];
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((n) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAt: n.created_at,
  }));
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await getSupabase();
  if (!supabase) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  return count ?? 0;
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const supabase = await getSupabase();
  if (!supabase) return 0;

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`);

  if (!conversations?.length) return 0;

  const ids = conversations.map((c) => c.id);
  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", ids)
    .neq("sender_id", userId)
    .eq("read", false);

  return count ?? 0;
}
