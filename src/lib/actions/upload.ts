"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);

const MAX_BYTES = MAX_IMAGE_BYTES;
const ALLOWED_TYPES = ALLOWED_IMAGE_TYPES;

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

const COMMENT_ATTACHMENT_MAX_BYTES = 512 * 1024;
const COMMENT_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Upload an image or short video file for a business post (images ≤5 MB, videos ≤50 MB). */
export async function uploadBusinessMedia(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Storage is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to upload files." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);

  if (!isImage && !isVideo) {
    return { error: "Upload a JPG, PNG, WebP, GIF, MP4, WebM, or MOV file." };
  }

  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return { error: isVideo ? "Video must be 50 MB or smaller." : "Image must be 5 MB or smaller." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
  const safeExts = isVideo
    ? ["mp4", "webm", "mov", "m4v"]
    : ["jpg", "jpeg", "png", "webp", "gif"];
  const safeExt = safeExts.includes(ext) ? ext : safeExts[0];
  const folder = isVideo ? "videos" : "images";
  const path = `${user.id}/${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${safeExt}`;

  const { error } = await supabase.storage.from("business-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.error("[upload-media]", error.message);
    return { error: "Upload failed. Please try again." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("business-media").getPublicUrl(path);

  return { url: publicUrl };
}

/** Upload a small image attachment for a post comment (max 512 KB). */
export async function uploadCommentAttachment(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Storage is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to attach files." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to attach." };
  }

  if (!COMMENT_ATTACHMENT_TYPES.has(file.type)) {
    return { error: "Attach a JPG, PNG, WebP, or GIF image." };
  }

  if (file.size > COMMENT_ATTACHMENT_MAX_BYTES) {
    return { error: "Attachment must be 512 KB or smaller." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const path = `${user.id}/comments/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${safeExt}`;

  const { error } = await supabase.storage.from("business-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.error("[upload-comment]", error.message);
    return { error: "Upload failed. Please try again." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("business-media").getPublicUrl(path);

  return { url: publicUrl };
}
