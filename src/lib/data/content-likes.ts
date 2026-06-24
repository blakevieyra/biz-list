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

  const { data: rows } = await supabase
    .from("business_content_likes")
    .select("target_type, target_id, user_id")
    .eq("business_id", businessId);

  for (const row of rows ?? []) {
    const key = contentLikeKey(row.target_type as ContentLikeTarget, row.target_id);
    if (!(key in counts)) continue;
    counts[key] = (counts[key] ?? 0) + 1;
    if (userId && row.user_id === userId) userLiked.push(key);
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
