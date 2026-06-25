import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertsPreview,
  ApplicationsList,
  FollowingList,
  MessagesPreview,
  ProfileHubNav,
  type HubTab,
} from "@/components/profile-hub-sections";
import { ProfilePlansPanel } from "@/components/profile-plans-panel";
import { ProfilePreferencesPanel } from "@/components/profile-preferences-panel";
import { BusinessGrowthHub } from "@/components/business-growth-hub";
import { PageHeader, Card } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import {
  getCurrentProfile,
  getFollowedBusinesses,
  getNotifications,
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "@/lib/data";
import { getJobApplicationsForApplicant } from "@/lib/data/business";
import { getLatestAiAssessment, getLocalLeads } from "@/lib/data/pro";
import { getConversations } from "@/lib/data/messages";
import { canAccess, hasBizListPlusPerks } from "@/lib/plans";

const validTabs = new Set<HubTab>([
  "overview",
  "plans",
  "following",
  "applications",
  "messages",
  "alerts",
  "growth",
]);

export default async function ProfileHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const params = await searchParams;
  const tab: HubTab = validTabs.has(params.tab as HubTab) ? (params.tab as HubTab) : "overview";

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const isBusinessAccount =
    profile.role === "business" || profile.role === "organization";

  const [following, applications, conversations, notifications, unreadMessages, unreadAlerts, latestAudit, leads] =
    await Promise.all([
      getFollowedBusinesses(userId),
      profile.role === "customer" ? getJobApplicationsForApplicant(userId) : Promise.resolve([]),
      getConversations(userId),
      getNotifications(userId),
      getUnreadMessageCount(userId),
      getUnreadNotificationCount(userId),
      isBusinessAccount && canAccess(profile.planTier, "aiAudit")
        ? getLatestAiAssessment(userId)
        : Promise.resolve(null),
      isBusinessAccount && canAccess(profile.planTier, "localLeads")
        ? getLocalLeads(userId)
        : Promise.resolve([]),
    ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="My profile"
        description="Manage preferences, businesses you follow, applications, messages, and alerts."
        action={
          isBusinessAccount ? (
            <Link
              href="/dashboard/profile"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Edit listing
            </Link>
          ) : undefined
        }
      />

      <ProfileHubNav
        active={tab}
        followingCount={following.length}
        applicationCount={applications.length}
        unreadMessages={unreadMessages}
        unreadAlerts={unreadAlerts}
        showGrowthTab={isBusinessAccount}
        leadCount={leads.length}
      />

      {tab === "overview" && (
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Quick links</h2>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/profile?tab=following" className="text-accent hover:underline">
                {following.length} following
              </Link>
              {profile.role === "customer" && (
                <Link href="/profile?tab=applications" className="text-accent hover:underline">
                  {applications.length} applications
                </Link>
              )}
              {isBusinessAccount && (
                <Link href="/profile?tab=growth" className="text-accent hover:underline">
                  Growth tools{leads.length > 0 ? ` · ${leads.length} leads` : ""}
                </Link>
              )}
              <Link href="/profile?tab=messages" className="text-accent hover:underline">
                Messages{unreadMessages > 0 ? ` (${unreadMessages} unread)` : ""}
              </Link>
              <Link href="/profile?tab=alerts" className="text-accent hover:underline">
                Alerts{unreadAlerts > 0 ? ` (${unreadAlerts} unread)` : ""}
              </Link>
              <Link href="/profile?tab=plans" className="text-accent hover:underline">
                Plans & billing
              </Link>
            </div>
          </Card>
          {isBusinessAccount ? (
            <>
              <BusinessGrowthHub planTier={profile.planTier} latestAudit={latestAudit} leads={leads} />
              {hasBizListPlusPerks(profile.planTier) && (
                <ProfilePreferencesPanel profile={profile} variant="BizList-plus" />
              )}
            </>
          ) : (
            <ProfilePreferencesPanel profile={profile} />
          )}
        </div>
      )}

      {tab === "plans" && (
        <ProfilePlansPanel role={profile.role} planTier={profile.planTier} />
      )}

      {tab === "growth" &&
        (isBusinessAccount ? (
          <BusinessGrowthHub planTier={profile.planTier} latestAudit={latestAudit} leads={leads} />
        ) : (
          <Card>
            <p className="text-sm text-muted">Growth tools are available on business accounts.</p>
          </Card>
        ))}

      {tab === "following" && <FollowingList businesses={following} />}
      {tab === "applications" &&
        (profile.role === "customer" ? (
          <ApplicationsList
            applications={applications}
            emptyLabel="You haven't applied to any jobs yet. Browse hiring businesses on Listings."
          />
        ) : (
          <Card>
            <p className="text-sm text-muted">
              Job applications are for customer profiles.{" "}
              <Link href="/dashboard/applications" className="text-accent hover:underline">
                View applications to your business
              </Link>
            </p>
          </Card>
        ))}
      {tab === "messages" && <MessagesPreview conversations={conversations} />}
      {tab === "alerts" && <AlertsPreview notifications={notifications} />}
    </div>
  );
}