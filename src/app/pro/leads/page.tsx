import Link from "next/link";
import { redirect } from "next/navigation";
import { contactLead } from "@/lib/actions/pro";
import { Card, PageHeader } from "@/components/ui";
import { getLocalLeads } from "@/lib/data/pro";
import { getCurrentProfile } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

export default async function ProLeadsPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile || profile.planTier !== "pro") redirect("/pricing");

  const leads = await getLocalLeads(userId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/pro" className="text-sm text-accent hover:underline">
        ← Back to Pro dashboard
      </Link>
      <PageHeader
        title="Local Leads"
        description="Customers in your area with interests that match your business category and local activity."
      />

      {leads.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No matched leads yet. As customers join AllConnect in your area and set interests,
            they will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{lead.displayName}</h2>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {lead.matchScore}% match
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {lead.city}, {lead.state}
                  </p>
                  <p className="mt-3 text-sm">{lead.bio}</p>
                  {lead.interestTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {lead.interestTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {lead.forumInterests.length > 0 && (
                    <p className="mt-2 text-xs text-muted">
                      Forum interests:{" "}
                      {lead.forumInterests
                        .map((interest) => FORUM_CATEGORY_LABELS[interest])
                        .join(", ")}
                    </p>
                  )}
                  {lead.matchReasons.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-muted">
                      {lead.matchReasons.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <form action={contactLead.bind(null, lead.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Message lead
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
