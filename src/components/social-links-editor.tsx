"use client";

import type { BusinessSocialLinks } from "@/lib/types";

const FIELDS: { key: keyof BusinessSocialLinks; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbusiness" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourbusiness" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/yourbusiness" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourbusiness" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourbusiness" },
];

export function SocialLinksEditor({
  links,
  onChange,
}: {
  links: BusinessSocialLinks;
  onChange: (links: BusinessSocialLinks) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Social media profiles</p>
        <p className="mt-1 text-xs text-muted">
          Add links so customers can follow you on social platforms.
        </p>
      </div>
      {FIELDS.map(({ key, label, placeholder }) => (
        <label key={key} className="block text-sm">
          <span className="font-medium">{label}</span>
          <input
            value={links[key] ?? ""}
            onChange={(e) => onChange({ ...links, [key]: e.target.value })}
            placeholder={placeholder}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>
      ))}
    </div>
  );
}
