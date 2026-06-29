"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Card } from "@/components/ui";
import { respondToAffiliation, removeAffiliation } from "@/lib/actions/affiliates";
import type { BusinessAffiliate } from "@/lib/actions/affiliates";

function AvatarCircle({ name, src }: { name: string; src?: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
  if (src) return <img src={src} alt={name} className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
      {initials || "?"}
    </div>
  );
}

function AffiliateRow({
  affiliate,
  isMarketer,
}: {
  affiliate: BusinessAffiliate;
  isMarketer: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        {isMarketer ? (
          <>
            {affiliate.businessMediaUrl ? (
              <img src={affiliate.businessMediaUrl} alt={affiliate.businessName} className="h-8 w-8 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
                {affiliate.businessName[0]}
              </div>
            )}
            <div className="min-w-0">
              <Link href={`/listings/${affiliate.businessId}`} className="block truncate text-sm font-medium hover:text-accent">
                {affiliate.businessName}
              </Link>
              <p className="text-xs text-muted">{affiliate.businessCategory}</p>
            </div>
          </>
        ) : (
          <>
            <AvatarCircle name={affiliate.marketerName} src={affiliate.marketerAvatarUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{affiliate.marketerName}</p>
              <p className="text-xs text-muted">Marketer</p>
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {affiliate.status === "pending" && !isMarketer && (
          <>
            <form action={() => startTransition(() => respondToAffiliation(affiliate.id, true) as unknown as void)}>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Accept
              </button>
            </form>
            <form action={() => startTransition(() => respondToAffiliation(affiliate.id, false) as unknown as void)}>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted hover:border-red-300 hover:text-red-500 disabled:opacity-50"
              >
                Decline
              </button>
            </form>
          </>
        )}

        {affiliate.status === "pending" && isMarketer && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Pending</span>
        )}

        {affiliate.status === "active" && isMarketer && (
          <Link
            href={`/dashboard/affiliates/${affiliate.businessId}/posts`}
            className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20"
          >
            Post →
          </Link>
        )}

        {affiliate.status === "active" && !isMarketer && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span>
        )}

        {affiliate.status === "declined" && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted">Declined</span>
        )}

        <form action={() => startTransition(() => removeAffiliation(affiliate.id) as unknown as void)}>
          <button
            type="submit"
            disabled={isPending}
            className="text-xs text-muted hover:text-red-500 disabled:opacity-50"
          >
            ✕
          </button>
        </form>
      </div>
    </li>
  );
}

export function AffiliatesPanel({
  affiliates,
  isMarketer,
  businessId,
}: {
  affiliates: BusinessAffiliate[];
  isMarketer: boolean;
  businessId?: string;
}) {
  const pending = affiliates.filter((a) => a.status === "pending");
  const active = affiliates.filter((a) => a.status === "active");

  if (!isMarketer && !businessId) return null;
  if (affiliates.length === 0 && !isMarketer) return null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {isMarketer ? "Affiliated businesses" : "Affiliate marketers"}
          </h2>
          {pending.length > 0 && (
            <p className="mt-0.5 text-xs font-medium text-amber-700">
              {pending.length} pending {pending.length === 1 ? "request" : "requests"}
            </p>
          )}
        </div>
        {isMarketer && (
          <Link href="/dashboard/affiliates" className="text-sm text-accent hover:underline">
            Manage →
          </Link>
        )}
      </div>

      {affiliates.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          {isMarketer
            ? <>No affiliations yet. <Link href="/listings" className="text-accent hover:underline">Browse businesses</Link> to request one.</>
            : "No affiliate marketers yet."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border/50">
          {[...pending, ...active, ...affiliates.filter((a) => a.status === "declined")].map((a) => (
            <AffiliateRow key={a.id} affiliate={a} isMarketer={isMarketer} />
          ))}
        </ul>
      )}
    </Card>
  );
}
