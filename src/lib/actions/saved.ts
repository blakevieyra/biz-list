"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "./auth";

export async function toggleSaveItem(input: {
  itemType: string;
  itemId: string;
  itemTitle: string;
  itemSubtitle?: string;
  itemDescription?: string;
  itemUrl?: string;
  itemImageUrl?: string;
}): Promise<{ saved: boolean; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { saved: false, error: "Sign in to save items." };

  const supabase = await createClient();
  if (!supabase) return { saved: false, error: "Database unavailable." };

  const { data: existing } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", userId)
    .eq("item_type", input.itemType)
    .eq("item_id", input.itemId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_items").delete().eq("id", existing.id);
    revalidatePath("/dashboard");
    return { saved: false };
  }

  await supabase.from("saved_items").insert({
    user_id: userId,
    item_type: input.itemType,
    item_id: input.itemId,
    item_title: input.itemTitle,
    item_subtitle: input.itemSubtitle ?? null,
    item_description: input.itemDescription ?? null,
    item_url: input.itemUrl ?? null,
    item_image_url: input.itemImageUrl ?? null,
  });
  revalidatePath("/dashboard");
  return { saved: true };
}
