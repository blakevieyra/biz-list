import { createClient } from "@/lib/supabase/server";
import {
  contentLikeKey,
  type ContentLikeState,
  type ContentLikeTarget,
} from "@/lib/content-likes-types";

export type { ContentLikeState, ContentLikeTarget } from "@/lib/content-likes-types";
export { contentLikeKey } from "@/lib/content-likes-types";

export async function getBusinessContentLikeState(
  businessId: string,
  userId: string | null,
  targets: { type: ContentLikeTarget; id: string }[],
): Promise<ContentLikeState> {
  const counts: Record<string, number> = {};
  const userLiked: string[] = [];

  for (const target of targets) {
    counts[contentLikeKey(target.type, target.id)] = 0;
  }

  if (targets.length === 0) return { counts, userLiked };

  const supabase = await createClient();
  if (!supabase) return { counts, userLiked };

  const idsByType = new Map<ContentLikeTarget, string[]>();
  for (const target of targets) {
    const list = idsByType.get(target.type) ?? [];
    list.push(target.id);
    idsByType.set(target.type, list);
  }

  const queries = [...idsByType.entries()].map(([targetType, targetIds]) =>
    supabase
      .from("business_content_likes")
      .select("target_type, target_id, user_id")
      .eq("business_id", businessId)
      .eq("target_type", targetType)
      .in("target_id", targetIds),
  );

  const results = await Promise.all(queries);
  for (const { data: rows } of results) {
    for (const row of rows ?? []) {
      const key = contentLikeKey(row.target_type as ContentLikeTarget, row.target_id);
      if (!(key in counts)) continue;
      counts[key] = (counts[key] ?? 0) + 1;
      if (userId && row.user_id === userId && !userLiked.includes(key)) {
        userLiked.push(key);
      }
    }
  }

  return { counts, userLiked };
}

export async function getPostLikeCounts(postIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of postIds) map.set(id, 0);
  if (postIds.length === 0) return map;

  const supabase = await createClient();
  if (!supabase) return map;

  const { data: rows } = await supabase
    .from("business_content_likes")
    .select("target_id")
    .eq("target_type", "post")
    .in("target_id", postIds);

  for (const row of rows ?? []) {
    map.set(row.target_id, (map.get(row.target_id) ?? 0) + 1);
  }

  return map;
}

export async function getPostLikedByViewer(
  postIds: string[],
  userId: string | null,
): Promise<Set<string>> {
  const liked = new Set<string>();
  if (!postIds.length || !userId) return liked;

  const supabase = await createClient();
  if (!supabase) return liked;

  const { data: rows } = await supabase
    .from("business_content_likes")
    .select("target_id")
    .eq("target_type", "post")
    .eq("user_id", userId)
    .in("target_id", postIds);

  for (const row of rows ?? []) {
    liked.add(row.target_id);
  }

  return liked;
}

export async function getCommentLikeCounts(
  commentIds: string[],
  userId: string | null,
): Promise<{ counts: Map<string, number>; likedByViewer: Set<string> }> {
  const counts = new Map<string, number>();
  const likedByViewer = new Set<string>();
  for (const id of commentIds) counts.set(id, 0);
  if (commentIds.length === 0) return { counts, likedByViewer };

  const supabase = await createClient();
  if (!supabase) return { counts, likedByViewer };

  const { data: rows } = await supabase
    .from("business_content_likes")
    .select("target_id, user_id")
    .eq("target_type", "comment")
    .in("target_id", commentIds);

  for (const row of rows ?? []) {
    counts.set(row.target_id, (counts.get(row.target_id) ?? 0) + 1);
    if (userId && row.user_id === userId) likedByViewer.add(row.target_id);
  }

  return { counts, likedByViewer };
}
