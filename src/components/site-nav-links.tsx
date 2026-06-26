"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type SiteNavMatch = "home" | "listings" | "feed" | "partnerships" | "events" | "forum";

export const SITE_NAV_LINKS: {
  href: string;
  label: string;
  authOnly?: boolean;
  match: SiteNavMatch;
}[] = [
  { href: "/home", label: "Home", authOnly: true, match: "home" },
  { href: "/home?view=activity", label: "Feed", authOnly: true, match: "feed" },
  { href: "/listings", label: "Listings", match: "listings" },
  { href: "/partnerships", label: "Collaborations", match: "partnerships" },
  { href: "/events", label: "Events", match: "events" },
  { href: "/forum", label: "Forum", match: "forum" },
];

function isNavLinkActive(match: SiteNavMatch, pathname: string, view: string | null): boolean {
  switch (match) {
    case "home":
      return pathname === "/home" && view !== "activity";
    case "feed":
      return pathname === "/feed" || (pathname === "/home" && view === "activity");
    case "listings":
      return pathname === "/listings" || pathname.startsWith("/listings/");
    case "partnerships":
      return pathname === "/partnerships" || pathname.startsWith("/partnerships/");
    case "events":
      return pathname === "/events" || pathname.startsWith("/events/");
    case "forum":
      return pathname === "/forum" || pathname.startsWith("/forum/");
    default:
      return false;
  }
}

function navLinkClassName(active: boolean): string {
  return active
    ? "border-b-2 border-accent pb-0.5 text-foreground"
    : "border-b-2 border-transparent pb-0.5 text-muted transition hover:border-border hover:text-foreground";
}

export function SiteNavLinks({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  return (
    <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
      {SITE_NAV_LINKS.filter((link) => !link.authOnly || userId).map((link) => {
        const active = isNavLinkActive(link.match, pathname, view);
        return (
          <Link key={link.match} href={link.href} className={navLinkClassName(active)}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function useSiteNavActive(match: SiteNavMatch): boolean {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  return isNavLinkActive(match, pathname, view);
}
