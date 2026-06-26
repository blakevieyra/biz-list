import Link from "next/link";
import { Suspense } from "react";
import {
  getCurrentProfile,
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "@/lib/data";
import { getAuthUserId, signOut } from "@/lib/actions/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { SiteNavLinks } from "@/components/site-nav-links";
import { isBusinessPlan, PLAN_LABELS } from "@/lib/plans";

export async function SiteHeader() {
  const userId = await getAuthUserId();
  const profile = await getCurrentProfile();
  const notificationCount = userId ? await getUnreadNotificationCount(userId) : 0;
  const profileHref = profile ? "/profile" : "/profile/create";
  const messageCount = userId ? await getUnreadMessageCount(userId) : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size="md" href={userId ? "/home" : "/"} />
          <Suspense fallback={null}>
            <MobileNav
              userId={userId}
              displayName={profile?.displayName}
              profileRole={profile?.role}
            />
          </Suspense>
        </div>

        <Suspense
          fallback={
            <nav className="hidden items-center gap-5 text-sm font-medium text-muted lg:flex">
              <span>Home</span>
              <span>Listings</span>
              <span>Feed</span>
              <span>Collaborations</span>
              <span>Events</span>
              <span>Forum</span>
            </nav>
          }
        >
          <SiteNavLinks userId={userId} />
        </Suspense>

        <div className="flex shrink-0 items-center gap-2">
          {!isSupabaseConfigured() && (
            <span className="hidden text-xs text-amber-700 xl:inline">Demo mode</span>
          )}

          {userId && profile ? (
            <>
              {profile.role !== "customer" && (
                <Link
                  href="/dashboard"
                  className="hidden rounded-full bg-blue-50 px-3 py-2 text-sm font-medium text-accent sm:inline-flex"
                >
                  {isBusinessPlan(profile.planTier) ? PLAN_LABELS[profile.planTier] : "Dashboard"}
                </Link>
              )}

              <Link
                href="/notifications"
                className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-border px-2.5 text-sm hover:border-accent/40 sm:px-3"
                aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ""}`}
              >
                <span className="hidden sm:inline">Alerts</span>
                <span className="sm:hidden" aria-hidden>
                  A
                </span>
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                    {notificationCount}
                  </span>
                )}
              </Link>

              <Link
                href="/messages"
                className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-border px-2.5 text-sm hover:border-accent/40 sm:px-3"
                aria-label={`Messages${messageCount > 0 ? `, ${messageCount} unread` : ""}`}
              >
                <span className="hidden sm:inline">Messages</span>
                <span className="sm:hidden" aria-hidden>
                  M
                </span>
                {messageCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                    {messageCount}
                  </span>
                )}
              </Link>

              <div className="hidden items-center gap-2 lg:flex">
                <Link href={profileHref} className="max-w-[120px] truncate text-sm font-medium">
                  {profile.displayName}
                </Link>
              </div>

              <form action={signOut}>
                <button
                  type="submit"
                  className="hidden min-h-10 rounded-full border border-border px-3 py-2 text-sm hover:border-accent/40 sm:inline-flex"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden min-h-10 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40 sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex min-h-10 items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
              >
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Join</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const footerLinks = [
    { href: "/help", label: "Help" },
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/support", label: "Support" },
  ];

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <p className="max-w-md text-sm leading-relaxed text-muted">
            © 2026 BizList — local business latest, listings and partnerships.
          </p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end lg:gap-x-8">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-sm font-medium text-muted transition hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
