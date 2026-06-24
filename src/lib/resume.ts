import type { UserProfile } from "@/lib/types";

export function buildResumeSnapshot(profile: Pick<
  UserProfile,
  | "displayName"
  | "headline"
  | "city"
  | "state"
  | "skills"
  | "experienceText"
  | "resumeText"
  | "targetJobTitles"
  | "industryInterests"
  | "bio"
>): string {
  if (profile.resumeText.trim()) {
    return profile.resumeText.trim();
  }

  const lines = [
    profile.displayName,
    profile.headline || undefined,
    `${profile.city}, ${profile.state}`.trim(),
    profile.bio ? `\nAbout\n${profile.bio}` : undefined,
    profile.skills.length ? `\nSkills\n${profile.skills.join(", ")}` : undefined,
    profile.experienceText.trim() ? `\nExperience\n${profile.experienceText.trim()}` : undefined,
    profile.targetJobTitles.length
      ? `\nTarget roles\n${profile.targetJobTitles.join(", ")}`
      : undefined,
    profile.industryInterests.length
      ? `\nIndustries\n${profile.industryInterests.join(", ")}`
      : undefined,
  ].filter(Boolean);

  return lines.join("\n").slice(0, 4000);
}
