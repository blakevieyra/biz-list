"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function uploadBusinessImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Storage is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to upload images." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Upload a JPG, PNG, WebP, or GIF image." };
  }

  if (file.size > MAX_BYTES) {
    return { error: "Image must be 5 MB or smaller." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${safeExt}`;

  const { error } = await supabase.storage.from("business-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.error("[upload]", error.message);
    return { error: "Upload failed. Please try again." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("business-media").getPublicUrl(path);

  return { url: publicUrl };
}
