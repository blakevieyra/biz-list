"use client";

import { useActionState } from "react";
import Link from "next/link";
import { contactLead } from "@/lib/actions/pro";
import { Card } from "@/components/ui";
import type { LocalLead, PlanTier } from "@/lib/types";
import { canAccess } from "@/lib/plans";

const sourceLabels: Record<NonNullable<LocalLead["leadSource"]>, string> = {
  follower: "Follows you",
  interest: "Interest match",
  seeking: "Job seeker",
  local: "Local match",
};

function MessageLeadButton({ leadId }: { leadId: string }) {
  const [error, dispatch, isPending] = useActionState(
    (_prev: string | null, _fd: FormData) => contactLead(leadId),
    null,
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={dispatch}>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40 disabled:opacity-50"
        >
          {isPending ? "Opening…" : "Message"}
        </button>
      </form>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function LeadsPreviewPanel({
  planTier,
  leads,
  limit = 5,
}: {
  planTier: PlanTier;
  leads: LocalLead[];
  limit?: number;
}) {
  const hasAccess = canAccess(planTier, "localLeads");
  const visible = leads.slice(0, limit);

  if (!hasAccess) {
    return (
      <Card>
        <h2 className="font-semibold">Lead generation</h2>
        <p className="mt-2 text-sm text-muted">
          Pro and Platinum surface potential customers from followers, shared interests, and local
          job seekers.
        </p>
        <Link href="/pricing" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          Upgrade to Pro →
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Lead generation</h2>
          <p className="mt-1 text-sm text-muted">
            Matched from follows, industry interests, location, listing views, and post engagement.
          </p>
        </div>
        <Link href="/dashboard/leads" className="text-sm font-medium text-accent hover:underline">
          All leads ({leads.length}) →
        </Link>
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No matched leads yet. Encourage customers to follow your listing and set industry interests.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((lead) => (
            <li key={lead.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{lead.displayName}</p>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent">
                      {lead.matchScore}% match
                    </span>
                    {lead.leadSource && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted">
                        {sourceLabels[lead.leadSource]}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {lead.city}, {lead.state}
                  </p>
                  {lead.matchReasons[0] && (
                    <p className="mt-1 text-sm text-muted">{lead.matchReasons[0]}</p>
                  )}
                </div>
                <MessageLeadButton leadId={lead.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
