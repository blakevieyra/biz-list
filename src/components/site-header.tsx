import Link from "next/link";
import {
  getCurrentProfile,
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "@/lib/data";
import { getAuthUserId, signOut } from "@/lib/actions/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const links = [
  { href: "/directory", label: "Directory" },
  { href: "/forum", label: "Forum" },
  { href: "/collaborate", label: "Collaborate" },
  { href: "/pricing", label: "Pricing" },
  { href: "/messages", label: "Messages" },
];

export async function SiteHeader() {
  const userId = await getAuthUserId();
  const profile = await getCurrentProfile();
  const notificationCount = userId
    ? await getUnreadNotificationCount(userId)
    : 0;
  const messageCount = userId ? await getUnreadMessageCount(userId) : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm text-white">
            AC
          </span>
          <span>AllConnect</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {!isSupabaseConfigured() && (
            <span className="hidden text-xs text-amber-700 lg:inline">
              Demo mode
            </span>
          )}
          {userId && profile ? (
            <>
              {profile.planTier === "pro" && (
                <Link
                  href="/pro"
                  className="hidden rounded-full bg-teal-100 px-3 py-2 text-sm font-medium text-teal-800 sm:inline-flex"
                >
                  Pro
                </Link>
              )}
              <Link
                href="/notifications"
                className="relative rounded-full border border-border px-3 py-2 text-sm hover:border-accent/40"
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
                className="relative hidden rounded-full border border-border px-3 py-2 text-sm hover:border-accent/40 sm:inline-flex"
              >
                Messages
                {messageCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                    {messageCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile/create"
                className="hidden max-w-[120px] truncate text-sm font-medium sm:inline"
              >
                {profile.displayName}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-full border border-border px-3 py-2 text-sm hover:border-accent/40"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
              >
                Get Started
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">AllConnect</p>
            <p className="mt-1 text-sm text-muted">
              Local businesses and organizations — discover, connect, collaborate.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <Link href="/directory" className="hover:text-foreground">
              Directory
            </Link>
            <Link href="/forum" className="hover:text-foreground">
              Forum
            </Link>
            <Link href="/collaborate" className="hover:text-foreground">
              Collaborate
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/messages" className="hover:text-foreground">
              Messages
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
