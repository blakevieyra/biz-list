import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/data";
import { getMyAffiliations } from "@/lib/actions/affiliates";
import { respondToAffiliation, removeAffiliation } from "@/lib/actions/affiliates";
import { Card, formatDate } from "@/components/ui";

export const metadata = { title: "Affiliated businesses" };

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};

export default async function AffiliatesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");
  if (profile.role !== "marketer") redirect("/dashboard");

  const affiliations = await getMyAffiliations();
  const active = affiliations.filter((a) => a.status === "active");
  const pending = affiliations.filter((a) => a.status === "pending");
  const declined = affiliations.filter((a) => a.status === "declined");

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Affiliated businesses</h1>
        <p className="mt-1 text-sm text-muted">
          Businesses you work on behalf of. Browse listings to request new affiliations.
        </p>
      </div>

      {/* Active */}
      <section>
        <h2 className="mb-3 font-semibold">Active ({active.length})</h2>
        {active.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              No active affiliations yet.{" "}
              <Link href="/listings" className="text-accent hover:underline">Browse businesses</Link>{" "}
              to request one.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {active.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {a.businessMediaUrl ? (
                      <img src={a.businessMediaUrl} alt={a.businessName} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent">
                        {a.businessName[0]}
                      </div>
                    )}
                    <div>
                      <Link href={`/listings/${a.businessId}`} className="font-semibold hover:text-accent">
                        {a.businessName}
                      </Link>
                      <p className="text-sm text-muted">{a.businessCategory} · {a.businessCity}, {a.businessState}</p>
                      <p className="mt-0.5 text-xs text-muted">Affiliated since {formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE.active}`}>
                      Active
                    </span>
                    <Link href={`/dashboard/affiliates/${a.businessId}/posts`} className="text-sm font-medium text-accent hover:underline">
                      Post →
                    </Link>
                    <form action={async () => { await removeAffiliation(a.id); }}>
                      <button type="submit" className="text-xs text-muted hover:text-red-500">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Pending ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map((a) => (
              <Card key={a.id} className="opacity-80">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {a.businessMediaUrl ? (
                      <img src={a.businessMediaUrl} alt={a.businessName} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent">
                        {a.businessName[0]}
                      </div>
                    )}
                    <div>
                      <Link href={`/listings/${a.businessId}`} className="font-semibold hover:text-accent">
                        {a.businessName}
                      </Link>
                      <p className="text-sm text-muted">{a.businessCategory} · {a.businessCity}, {a.businessState}</p>
                      <p className="mt-0.5 text-xs text-muted">Requested {formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE.pending}`}>
                      Pending
                    </span>
                    <form action={async () => { await removeAffiliation(a.id); }}>
                      <button type="submit" className="text-xs text-muted hover:text-red-500">
                        Withdraw
                      </button>
                    </form>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-muted">Declined</h2>
          <div className="space-y-3">
            {declined.map((a) => (
              <Card key={a.id} className="opacity-60">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/listings/${a.businessId}`} className="font-medium hover:text-accent">
                      {a.businessName}
                    </Link>
                    <p className="text-sm text-muted">{a.businessCategory} · {a.businessCity}, {a.businessState}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE.declined}`}>
                    Declined
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="pt-2">
        <Link href="/listings" className="text-sm font-medium text-accent hover:underline">
          Browse businesses to affiliate with →
        </Link>
      </div>
    </div>
  );
}
