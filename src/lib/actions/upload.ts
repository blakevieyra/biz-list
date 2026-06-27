"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
// Accept any video/* MIME type — codec support is the browser's concern, not ours

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
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    return { error: "Upload an image (JPG/PNG/WebP/GIF) or any video file." };
  }

  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return { error: isVideo ? "Video must be 50 MB or smaller." : "Image must be 5 MB or smaller." };
  }

  const rawExt = file.name.split(".").pop()?.toLowerCase() || "";
  const safeImageExts = ["jpg", "jpeg", "png", "webp", "gif"];
  // Rename .mov → .mp4 so Supabase serves video/mp4 content-type,
  // which Chrome accepts. Most iPhone .mov files contain H.264 and play fine.
  const ext = isVideo
    ? (rawExt === "mov" ? "mp4" : rawExt.match(/^[a-z0-9]{1,8}$/) ? rawExt : "mp4")
    : (safeImageExts.includes(rawExt) ? rawExt : "jpg");
  const contentType = isVideo
    ? (rawExt === "mov" ? "video/mp4" : file.type)
    : file.type;
  const folder = isVideo ? "videos" : "images";
  const path = `${user.id}/${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage.from("business-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType,
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

const COLLAB_ATTACHMENT_IMAGE_MAX = 10 * 1024 * 1024;
const COLLAB_ATTACHMENT_DOC_MAX = 25 * 1024 * 1024;
const COLLAB_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const COLLAB_DOC_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

/** Upload a file (image, PDF, doc, spreadsheet) for a collaboration or offer. */
export async function uploadCollaborationAttachment(
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
    return { error: "Choose a file to attach." };
  }

  const isImage = COLLAB_IMAGE_TYPES.has(file.type);
  const isDoc = COLLAB_DOC_TYPES.has(file.type);

  if (!isImage && !isDoc) {
    return { error: "Upload an image (JPG/PNG/WebP/GIF), PDF, Word, Excel, or text file." };
  }

  const limit = isImage ? COLLAB_ATTACHMENT_IMAGE_MAX : COLLAB_ATTACHMENT_DOC_MAX;
  if (file.size > limit) {
    return { error: isImage ? "Image must be 10 MB or smaller." : "Document must be 25 MB or smaller." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${user.id}/collaborations/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage.from("business-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.error("[upload-collab]", error.message);
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
