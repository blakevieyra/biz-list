"use client";

import Link from "next/link";

export type HomeTab = "latest" | "listings" | "collaboration" | "profile";

const tabs: { id: HomeTab; label: string }[] = [
  { id: "latest", label: "Latest" },
  { id: "listings", label: "Listings" },
  { id: "collaboration", label: "Collaboration" },
  { id: "profile", label: "Profile" },
];

export function HomeHubNav({
  active,
  profileTab,
}: {
  active: HomeTab;
  profileTab?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const href =
          tab.id === "profile" && profileTab
            ? `/home?tab=profile&profileTab=${profileTab}`
            : tab.id === "latest"
              ? "/home"
              : `/home?tab=${tab.id}`;
        return (
          <Link
            key={tab.id}
            href={href}
            className={`rounded-full px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              active === tab.id
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      <Link
        href="/events"
        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground sm:px-4 sm:py-2 sm:text-sm"
      >
        Events
      </Link>
    </div>
  );
}
