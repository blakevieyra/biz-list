import type { BusinessSocialLinks } from "@/lib/types";

export const SOCIAL_PLATFORM_FIELDS: {
  key: keyof BusinessSocialLinks;
  label: string;
  placeholder: string;
}[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbusiness" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourbusiness" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
  { key: "x", label: "X", placeholder: "https://x.com/yourbusiness" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourbusiness" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourbusiness" },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/yourbusiness" },
  { key: "threads", label: "Threads", placeholder: "https://threads.net/@yourbusiness" },
  { key: "snapchat", label: "Snapchat", placeholder: "https://snapchat.com/add/yourbusiness" },
  { key: "yelp", label: "Yelp", placeholder: "https://yelp.com/biz/..." },
];

export function socialPlatformLabel(key: string): string {
  return SOCIAL_PLATFORM_FIELDS.find((field) => field.key === key)?.label ?? key;
}

export function parseSocialLinks(raw: unknown): BusinessSocialLinks {
  if (!raw || typeof raw !== "object") return {};
  const links = raw as Record<string, unknown>;
  const result: BusinessSocialLinks = {};
  for (const { key } of SOCIAL_PLATFORM_FIELDS) {
    const value = links[key];
    if (typeof value === "string" && value.trim()) {
      result[key] = value;
    }
  }
  return result;
}
