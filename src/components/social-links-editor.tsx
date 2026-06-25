"use client";

import type { BusinessSocialLinks } from "@/lib/types";
import { SOCIAL_PLATFORM_FIELDS } from "@/lib/social-platforms";

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
          Add profile links for the platforms you use. Leave blank any you do not have.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_PLATFORM_FIELDS.map(({ key, label, placeholder }) => (
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
    </div>
  );
}
