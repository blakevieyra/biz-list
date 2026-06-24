import type { BusinessPostType } from "@/lib/types";

export type { BusinessPostType };

export const BUSINESS_POST_TYPE_LABELS: Record<BusinessPostType, string> = {
  update: "Update",
  job: "Job opening",
  deal: "Sale or deal",
  video: "Video",
};

export const BUSINESS_POST_TYPE_HINTS: Record<BusinessPostType, string> = {
  update: "Share news, hours changes, events, or general updates with your local audience.",
  job: "Post an open role. Your listing will show as hiring and appear in the Jobs feed.",
  deal: "Promote a sale, discount, or limited-time offer for nearby customers.",
  video: "Share a product demo, behind-the-scenes clip, or promo video.",
};

export function youtubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export function isVideoUrl(url: string): boolean {
  return Boolean(youtubeEmbedUrl(url)) || isDirectVideoUrl(url);
}

export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url) || url.includes("supabase.co/storage");
}

export function parsePostType(value: string | undefined): BusinessPostType {
  const allowed: BusinessPostType[] = ["update", "job", "deal", "video"];
  return allowed.includes(value as BusinessPostType) ? (value as BusinessPostType) : "update";
}
