import Link from "next/link";
import type { UserProfile } from "@/lib/types";
import { Card } from "./ui";

export function CustomerCard({ profile }: { profile: UserProfile }) {
  const initials = profile.displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link href={`/listings/people/${profile.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition hover:border-accent/40 hover:shadow-md">
        <div className="flex flex-1 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-teal-50 text-lg font-bold text-accent">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{profile.displayName}</h3>
              {profile.isSeekingWork && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  Open to work
                </span>
              )}
            </div>
            {profile.headline && (
              <p className="mt-1 text-sm font-medium text-accent">{profile.headline}</p>
            )}
            <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{profile.bio}</p>
            {profile.industryInterests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.industryInterests.slice(0, 3).map((industry) => (
                  <span
                    key={industry}
                    className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-accent"
                  >
                    {industry}
                  </span>
                ))}
              </div>
            )}
            {profile.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.skills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted"
                  >
                    {skill}
                  </span>
                ))}
                {profile.skills.length > 4 && (
                  <span className="text-xs text-muted">+{profile.skills.length - 4} more</span>
                )}
              </div>
            )}
            <p className="mt-auto pt-4 text-xs text-muted">
              {profile.city}, {profile.state}
              {profile.zipCode ? ` ${profile.zipCode}` : ""}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
