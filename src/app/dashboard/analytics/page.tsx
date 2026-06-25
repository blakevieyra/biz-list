import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/data";
import { canAccess } from "@/lib/plans";
import { getBusinessAnalytics } from "@/lib/data/analytics";
import { createClient } from "@/lib/supabase/server";

async function getOwnerBusinessId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AnalyticsPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile || !canAccess(profile.planTier, "analytics")) redirect("/pricing");

  const businessId = await getOwnerBusinessId(userId);
  if (!businessId) {
    return (
      <>
        <PageHeader
          title="Analytics"
          description="Set up your business profile to start tracking visitors and engagement."
        />
        <Card>
          <p className="text-sm text-muted">
            No business listing found.{" "}
            <Link href="/dashboard/profile" className="text-accent hover:underline">
              Create your listing
            </Link>{" "}
            to start collecting analytics.
          </p>
        </Card>
      </>
    );
  }

  const analytics = await getBusinessAnalytics(businessId);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Page visits and offering button clicks for your business — last 30 days."
      />

      {!analytics ? (
        <Card>
          <p className="text-sm text-muted">Analytics data is not available right now.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Page views — last 7 days" value={analytics.views7d} />
            <StatCard label="Page views — last 30 days" value={analytics.views30d} />
            <StatCard label="Total page views" value={analytics.viewsAllTime} />
          </div>

          {/* Daily views chart (bar via width) */}
          <Card>
            <h2 className="font-semibold">Daily page views — last 14 days</h2>
            {analytics.dailyViews.every((d) => d.views === 0) ? (
              <p className="mt-4 text-sm text-muted">
                No page views yet. Share your listing to start collecting data.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {(() => {
                  const max = Math.max(...analytics.dailyViews.map((d) => d.views), 1);
                  return analytics.dailyViews.map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-right text-xs text-muted">
                        {formatDay(day.date)}
                      </span>
                      <div className="flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-5 rounded-full bg-accent/70 transition-all"
                          style={{ width: `${Math.max((day.views / max) * 100, day.views > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-xs font-medium">
                        {day.views}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </Card>

          {/* Offering clicks */}
          <Card>
            <h2 className="font-semibold">Offering button clicks — last 30 days</h2>
            {analytics.offeringClicks.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                No clicks tracked yet. Clicks are recorded when visitors tap Order, Book, or RSVP on
                your offerings.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left font-medium text-muted">Offering</th>
                      <th className="pb-2 text-left font-medium text-muted">Action</th>
                      <th className="pb-2 text-right font-medium text-muted">Clicks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analytics.offeringClicks.map((row) => (
                      <tr key={`${row.offeringName}-${row.clickType}`}>
                        <td className="py-2 font-medium">{row.offeringName}</td>
                        <td className="py-2 capitalize text-muted">{row.clickType}</td>
                        <td className="py-2 text-right font-bold">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <Link href="/dashboard" className="mt-6 inline-block text-sm text-accent hover:underline">
        ← Back to dashboard
      </Link>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </Card>
  );
}
