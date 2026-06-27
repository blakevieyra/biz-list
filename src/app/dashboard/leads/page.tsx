import Link from "next/link";
import { redirect } from "next/navigation";
import { contactLead } from "@/lib/actions/pro";
import { Card, PageHeader } from "@/components/ui";
import { getLocalLeads } from "@/lib/data/pro";
import { getCurrentProfile } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";
import { canAccess } from "@/lib/plans";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

export default async function DashboardLeadsPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile || !canAccess(profile.planTier, "localLeads")) redirect("/pricing");

  const leads = await getLocalLeads(userId);
  const hasMockLeads = leads.some((l) => l.isMock);

  return (
    <>
      <PageHeader
        title="Local leads"
        description="Potential customers from followers, shared industry interests, job seekers, and local profiles."
      />

      {hasMockLeads && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Preview mode</strong> — these are example leads. Real leads appear as customers join BizList in your area and follow or match your business.
        </div>
      )}

      {leads.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No matched leads yet. As customers join BizList in your area and set interests,
            they will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{lead.displayName}</h2>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {lead.matchScore}% match
                    </span>
                    {lead.isMock && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                        Preview
                      </span>
                    )}
                    {lead.isFollower && !lead.isMock && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-accent">
                        Follows you
                      </span>
                    )}
                    {lead.leadSource && !lead.isFollower && !lead.isMock && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-muted capitalize">
                        {lead.leadSource} match
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {lead.city}, {lead.state}
                  </p>
                  <p className="mt-3 text-sm">{lead.bio}</p>
                  {lead.matchReasons.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-muted">
                      {lead.matchReasons.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  )}
                  {lead.forumInterests.length > 0 && (
                    <p className="mt-2 text-xs text-muted">
                      Forum interests:{" "}
                      {lead.forumInterests
                        .map((interest) => FORUM_CATEGORY_LABELS[interest])
                        .join(", ")}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {lead.isMock ? (
                    <span className="inline-block rounded-full border border-border bg-slate-50 px-4 py-2 text-sm text-muted cursor-default">
                      Message lead
                    </span>
                  ) : (
                    <form action={async () => { "use server"; await contactLead(lead.id); }}>
                      <button
                        type="submit"
                        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                      >
                        Message lead
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Link href="/dashboard" className="mt-6 inline-block text-sm text-accent hover:underline">
        ← Back to dashboard
      </Link>
    </>
  );
}
