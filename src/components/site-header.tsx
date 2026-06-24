import Link from "next/link";
import {
  getCurrentProfile,
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "@/lib/data";
import { getAuthUserId, signOut } from "@/lib/actions/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { isBusinessPlan, PLAN_LABELS } from "@/lib/plans";

const links = [
  { href: "/feed", label: "Post" },
  { href: "/listings", label: "Listing" },
  { href: "/partnerships", label: "Collaboration" },
];

export async function SiteHeader() {
  const userId = await getAuthUserId();
  const profile = await getCurrentProfile();
  const notificationCount = userId ? await getUnreadNotificationCount(userId) : 0;
  const profileHref = profile ? "/profile" : "/profile/create";
  const messageCount = userId ? await getUnreadMessageCount(userId) : 0;
  const showPlansLink = Boolean(profile && profile.role !== "customer");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size="lg" />
          <MobileNav
            userId={userId}
            displayName={profile?.displayName}
            profileRole={profile?.role}
            showPlansLink={showPlansLink}
          />
        </div>

        <nav className="hidden items-center gap-5 text-sm font-medium text-muted lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

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
                className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-border px-3 text-sm hover:border-accent/40"
                aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ""}`}
              >
                Alerts
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                    {notificationCount}
                  </span>
                )}
              </Link>

              <Link
                href="/messages"
                className="relative inline-flex min-h-10 items-center rounded-full border border-border px-3 py-2 text-sm hover:border-accent/40"
              >
                Messages
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
                {showPlansLink && (
                  <Link href="/pricing" className="text-sm text-muted transition hover:text-foreground">
                    Plans
                  </Link>
                )}
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
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo size="sm" href="/" />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              BizList — local business listings, feed, and partnerships.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-muted sm:grid-cols-3">
            <Link href="/feed" className="min-h-10 leading-10 hover:text-foreground">
              Post
            </Link>
            <Link href="/listings" className="min-h-10 leading-10 hover:text-foreground">
              Listing
            </Link>
            <Link href="/partnerships" className="min-h-10 leading-10 hover:text-foreground">
              Collaboration
            </Link>
            <Link href="/messages" className="min-h-10 leading-10 hover:text-foreground">
              Messages
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
