"use client";

import Link from "next/link";
import { Card, formatDate, formatPostDateTime } from "@/components/ui";
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
  { id: "growth", label: "Growth", businessOnly: true },
  { id: "following", label: "Following" },
  { id: "applications", label: "Applications", customerOnly: true },
  { id: "messages", label: "Messages" },
  { id: "alerts", label: "Alerts" },
] as const;

type HubTab = (typeof tabs)[number]["id"] | "growth";

export function ProfileHubNav({
  active,
  followingCount,
  applicationCount,
  unreadMessages,
  unreadAlerts,
  showGrowthTab = false,
  leadCount = 0,
}: {
  active: HubTab;
  followingCount: number;
  applicationCount: number;
  unreadMessages: number;
  unreadAlerts: number;
  showGrowthTab?: boolean;
  leadCount?: number;
}) {
  const counts: Partial<Record<string, number>> = {
    following: followingCount,
    applications: applicationCount,
    messages: unreadMessages,
    alerts: unreadAlerts,
    growth: leadCount,
  };

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
            href={tab.id === "overview" ? "/profile" : `/profile?tab=${tab.id}`}
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
      <Link href="/messages" className="inline-block text-sm text-accent hover:underline">
        View all messages
      </Link>
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
      <Link href="/notifications" className="inline-block text-sm text-accent hover:underline">
        View all alerts
      </Link>
    </div>
  );
}

export type { HubTab };
