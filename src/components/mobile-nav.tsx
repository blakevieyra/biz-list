"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/actions/auth";
import { SITE_NAV_LINKS, useSiteNavActive } from "@/components/site-nav-links";
import type { UserRole } from "@/lib/types";

const authLinks = [
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Notifications" },
  { href: "/dashboard", label: "Dashboard" },
];

function MobileNavLink({
  href,
  label,
  match,
  onNavigate,
}: {
  href: string;
  label: string;
  match: (typeof SITE_NAV_LINKS)[number]["match"];
  onNavigate: () => void;
}) {
  const active = useSiteNavActive(match);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-medium ${
        active ? "bg-blue-50 text-accent underline decoration-accent underline-offset-4" : "hover:bg-blue-50"
      }`}
    >
      {label}
    </Link>
  );
}

export function MobileNav({
  userId,
  displayName,
  profileRole,
}: {
  userId?: string | null;
  displayName?: string | null;
  profileRole?: UserRole | null;
}) {
  const profileHref = profileRole ? "/profile" : "/profile/create";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border px-3 text-sm font-medium"
      >
        {open ? "Close" : "Menu"}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 top-16 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed left-0 right-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-card shadow-lg">
            <div className="p-4">
              {userId && displayName && (
                <p className="mb-3 truncate rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-accent">
                  {displayName}
                </p>
              )}
              <ul className="space-y-1">
                {SITE_NAV_LINKS.filter((link) => !link.authOnly || userId).map((link) => (
                  <li key={link.match}>
                    <MobileNavLink
                      href={link.href}
                      label={link.label}
                      match={link.match}
                      onNavigate={() => setOpen(false)}
                    />
                  </li>
                ))}
                <li>
                  <Link
                    href="/partnerships?tab=forum"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-blue-50"
                  >
                    Forum
                  </Link>
                </li>
                {userId &&
                  authLinks
                    .filter((link) => link.href !== "/dashboard" || profileRole !== "customer")
                    .map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-blue-50"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
              </ul>
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {userId ? (
                  <>
                    <Link
                      href={profileHref}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center justify-center rounded-full border border-border text-sm font-medium"
                    >
                      My profile
                    </Link>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm font-medium"
                      >
                        Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center justify-center rounded-full border border-border text-sm font-medium"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center justify-center rounded-full bg-accent text-sm font-medium text-white"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
