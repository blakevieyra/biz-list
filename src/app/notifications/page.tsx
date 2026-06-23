import Link from "next/link";
import { redirect } from "next/navigation";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/social";
import { Card, PageHeader, formatDate } from "@/components/ui";
import { getNotifications } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";

export default async function NotificationsPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const notifications = await getNotifications(userId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Notifications"
        description="Follows, connection requests, comments, and messages."
        action={
          notifications.some((n) => !n.read) ? (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent/40"
              >
                Mark all read
              </button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No notifications yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.read ? "opacity-70" : "border-accent/30"}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-sm text-muted">{notification.body}</p>
                  <p className="mt-2 text-xs text-muted">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <form action={markNotificationRead.bind(null, notification.id)}>
                    <button type="submit" className="text-xs text-accent hover:underline">
                      Mark read
                    </button>
                  </form>
                )}
              </div>
              {notification.link && (
                <Link
                  href={notification.link}
                  className="mt-3 inline-block text-sm text-accent hover:underline"
                >
                  View
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
