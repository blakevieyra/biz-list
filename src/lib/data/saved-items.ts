import { createClient } from "@/lib/supabase/server";

export type SavedItem = {
  id: string;
  itemType: string;
  itemId: string;
  itemTitle: string;
  itemSubtitle?: string | null;
  itemUrl?: string | null;
  savedAt: string;
};

export async function getSavedItems(userId: string): Promise<SavedItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("saved_items")
    .select("id, item_type, item_id, item_title, item_subtitle, item_url, saved_at")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r) => ({
    id: r.id,
    itemType: r.item_type,
    itemId: r.item_id,
    itemTitle: r.item_title,
    itemSubtitle: r.item_subtitle,
    itemUrl: r.item_url,
    savedAt: r.saved_at,
  }));
}

export async function getSavedItemState(
  userId: string,
  itemType: string,
  itemId: string,
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();
  return Boolean(data);
}
