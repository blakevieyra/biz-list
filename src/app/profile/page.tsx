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
  getMyCollaborations,
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
  "partnerships",
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
    profile.role === "business" || profile.role === "organization" || profile.role === "marketer";

  // Business users are managed from the dashboard — redirect with tab mapping
  if (isBusinessAccount) {
    const tabRedirects: Record<string, string> = {
      messages: "/messages",
      plans: "/pricing",
      growth: "/dashboard/leads",
      following: "/dashboard/following",
      alerts: "/dashboard/alerts",
      partnerships: "/partnerships",
    };
    const dest = tabRedirects[params.tab ?? ""] ?? "/dashboard";
    redirect(dest);
  }

  const [following, applications, conversations, notifications, unreadMessages, unreadAlerts, latestAudit, leads, myCollaborations] =
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
      isBusinessAccount ? getMyCollaborations(userId) : Promise.resolve([]),
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
        showPartnershipsTab={isBusinessAccount}
        partnershipCount={myCollaborations.length}
        editProfileHref="/profile/edit"
      />

      {tab === "overview" && (
        <div className="space-y-6">
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
      {tab === "partnerships" && (
        isBusinessAccount ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                {myCollaborations.length === 0
                  ? "You haven't posted any partnership opportunities yet."
                  : `${myCollaborations.length} partnership ${myCollaborations.length === 1 ? "opportunity" : "opportunities"} posted`}
              </p>
              <Link
                href="/partnerships/new"
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                + New
              </Link>
            </div>
            {myCollaborations.map((collab) => (
              <Link key={collab.id} href={`/partnerships/${collab.id}`} className="block">
                <Card className="hover:border-accent/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent capitalize">
                          {collab.collaborationType.replace("_", " ")}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          collab.status === "open" ? "bg-emerald-100 text-emerald-800" :
                          collab.status === "in_discussion" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {collab.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="font-semibold leading-snug">{collab.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{collab.summary}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      <p>{collab.interestedCount} interested</p>
                      {collab.deadline && (
                        <p className="mt-0.5">
                          Due {new Date(collab.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-muted">Partnership tools are available on business accounts.</p>
          </Card>
        )
      )}
      {tab === "messages" && <MessagesPreview conversations={conversations} />}
      {tab === "alerts" && <AlertsPreview notifications={notifications} />}
    </div>
  );
}