"use client";

import Link from "next/link";
import { Card, formatDate, formatPostDateTime } from "@/components/ui";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/social";
import { getSafeAppLink } from "@/lib/security/safe-link";
import type {
  FollowedBusiness,
  JobApplication,
  Notification,
} from "@/lib/types";

type ConversationPreview = {
  id: string;
  otherUserName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
};

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "plans", label: "Plans" },
  { id: "growth", label: "Growth", businessOnly: true },
  { id: "following", label: "Following" },
  { id: "applications", label: "Applications", customerOnly: true },
  { id: "messages", label: "Messages" },
  { id: "alerts", label: "Alerts" },
] as const;

export type HubTab = (typeof tabs)[number]["id"];

export function ProfileHubNav({
  active,
  followingCount,
  applicationCount,
  unreadMessages,
  unreadAlerts,
  showGrowthTab = false,
  leadCount = 0,
  basePath = "/profile",
}: {
  active: HubTab;
  followingCount: number;
  applicationCount: number;
  unreadMessages: number;
  unreadAlerts: number;
  showGrowthTab?: boolean;
  leadCount?: number;
  basePath?: string;
}) {
  const counts: Partial<Record<string, number>> = {
    following: followingCount,
    applications: applicationCount,
    messages: unreadMessages,
    alerts: unreadAlerts,
    growth: leadCount,
  };

  function tabHref(tabId: HubTab) {
    if (tabId === "overview") return basePath;
    return `${basePath}?tab=${tabId}`;
  }

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs
        .filter((tab) => {
          if (tab.id === "growth" && !showGrowthTab) return false;
          if ("customerOnly" in tab && tab.customerOnly && showGrowthTab) return false;
          return true;
        })
        .map((tab) => (
          <Link
            key={tab.id}
            href={tabHref(tab.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              active === tab.id
                ? "bg-accent text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {(counts[tab.id] ?? 0) > 0 ? ` (${counts[tab.id]})` : ""}
          </Link>
        ))}
    </div>
  );
}

export function FollowingList({ businesses }: { businesses: FollowedBusiness[] }) {
  if (!businesses.length) {
    return (
      <Card>
        <p className="text-sm text-muted">
          You&apos;re not following any businesses yet.{" "}
          <Link href="/listings" className="text-accent hover:underline">
            Browse listings
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {businesses.map((business) => (
        <Card key={business.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/listings/${business.id}`} className="font-semibold text-accent hover:underline">
                {business.name}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {business.category}
                {business.subcategory ? ` · ${business.subcategory}` : ""} · {business.city}, {business.state}
              </p>
              <p className="mt-1 text-xs text-muted">Following since {formatDate(business.followedAt)}</p>
            </div>
            {business.isHiring && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Hiring
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ApplicationsList({
  applications,
  emptyLabel,
}: {
  applications: JobApplication[];
  emptyLabel: string;
}) {
  if (!applications.length) {
    return (
      <Card>
        <p className="text-sm text-muted">{emptyLabel}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((application) => (
        <Link key={application.id} href={`/applications/${application.id}`}>
          <Card className="transition hover:border-accent/40 hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{application.businessName ?? "Business listing"}</p>
                <p className="mt-1 text-sm capitalize text-muted">{application.status}</p>
                <p className="mt-1 text-xs text-muted">
                  Applied {formatPostDateTime(application.createdAt)}
                </p>
              </div>
              <span className="text-sm text-accent">Open thread →</span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function MessagesPreview({ conversations }: { conversations: ConversationPreview[] }) {
  if (!conversations.length) {
    return (
      <Card>
        <p className="text-sm text-muted">No messages yet.</p>
        <Link href="/messages" className="mt-3 inline-block text-sm text-accent hover:underline">
          Open inbox
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => (
        <Link key={conversation.id} href={`/messages/${conversation.id}`}>
          <Card className="transition hover:border-accent/40 hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{conversation.otherUserName}</p>
                <p className="mt-1 line-clamp-1 text-sm text-muted">
                  {conversation.lastMessage ?? "Start the conversation"}
                </p>
              </div>
              {conversation.unreadCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function AlertsPreview({ notifications }: { notifications: Notification[] }) {
  if (!notifications.length) {
    return (
      <Card>
        <p className="text-sm text-muted">No alerts yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.slice(0, 12).map((notification) => (
        <Card key={notification.id} className={notification.read ? "opacity-75" : "border-accent/30"}>
          <p className="font-medium">{notification.title}</p>
          <p className="mt-1 text-sm text-muted">{notification.body}</p>
          <p className="mt-2 text-xs text-muted">{formatDate(notification.createdAt)}</p>
        </Card>
      ))}
      <Link href="/messages" className="inline-block text-sm text-accent hover:underline">
        View all alerts
      </Link>
    </div>
  );
}

function alertIsOrder(n: Notification) {
  const t = (n.title ?? "").toLowerCase();
  return t.includes("order") || t.includes("purchase") || t.includes("booked");
}

function alertIsMessage(n: Notification) {
  const t = (n.title ?? "").toLowerCase();
  return t.includes("message") || t.includes("replied") || t.includes("conversation");
}

/** Unified inbox: alerts on top, conversations below. */
export function MessagesHubSection({
  conversations,
  notifications,
  isBusinessUser = false,
}: {
  conversations: ConversationPreview[];
  notifications: Notification[];
  isBusinessUser?: boolean;
}) {
  const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const unreadAlerts = notifications.filter((n) => !n.read).length;
  const hasAnyUnread = unreadAlerts > 0;

  // Sort: unread orders first (business users), then unread messages, then other unread, then read
  const sorted = [...notifications].sort((a, b) => {
    const aOrder = isBusinessUser && alertIsOrder(a);
    const bOrder = isBusinessUser && alertIsOrder(b);
    if (aOrder && !bOrder) return -1;
    if (!aOrder && bOrder) return 1;
    const aMsg = alertIsMessage(a);
    const bMsg = alertIsMessage(b);
    if (!a.read && b.read) return -1;
    if (a.read && !b.read) return 1;
    if (aMsg && !bMsg) return -1;
    if (!aMsg && bMsg) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-8">

      {/* ── Alerts — TOP ── */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Alerts</h2>
            {unreadAlerts > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                {unreadAlerts}
              </span>
            )}
          </div>
          {hasAnyUnread && (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="text-xs text-accent hover:underline"
              >
                Mark all read
              </button>
            </form>
          )}
        </div>

        {sorted.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No alerts yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {sorted.map((n) => {
              const safeLink = getSafeAppLink(n.link);
              const isOrder = isBusinessUser && alertIsOrder(n);
              return (
                <Card
                  key={n.id}
                  className={`${n.read ? "opacity-70" : isOrder ? "border-emerald-300 bg-emerald-50/40" : "border-accent/30"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isOrder && !n.read && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                            Order
                          </span>
                        )}
                        <p className="font-medium text-sm">{n.title}</p>
                      </div>
                      <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                      <p className="mt-1 text-xs text-muted">{formatDate(n.createdAt)}</p>
                      {safeLink && (
                        <Link href={safeLink} className="mt-1.5 inline-block text-xs font-medium text-accent hover:underline">
                          View →
                        </Link>
                      )}
                    </div>
                    {!n.read && (
                      <form action={markNotificationRead.bind(null, n.id)}>
                        <button type="submit" className="shrink-0 text-xs text-muted hover:text-accent">
                          Mark read
                        </button>
                      </form>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Conversations — BELOW ── */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Messages</h2>
            {unreadMessages > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                {unreadMessages}
              </span>
            )}
          </div>
        </div>

        {conversations.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No conversations yet.</p>
            <p className="mt-1 text-xs text-muted">
              Follow businesses and message them from their listing page, or reply to leads from your dashboard.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <Link key={c.id} href={`/messages/${c.id}`}>
                <Card className="group transition hover:border-accent/40 hover:shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium group-hover:text-accent">{c.otherUserName}</p>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                        {c.lastMessage ?? "Start the conversation"}
                      </p>
                      {c.lastMessageAt && (
                        <p className="mt-0.5 text-xs text-muted">{formatDate(c.lastMessageAt)}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {c.unreadCount > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                          {c.unreadCount}
                        </span>
                      )}
                      <span className="text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100">
                        Reply →
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
