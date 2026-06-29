"use client";

import { useState, useTransition } from "react";
import { requestAffiliation, removeAffiliation } from "@/lib/actions/affiliates";
import type { AffiliateStatus } from "@/lib/actions/affiliates";

export function AffiliateButton({
  businessId,
  status: initialStatus,
}: {
  businessId: string;
  status: AffiliateStatus | null;
}) {
  const [status, setStatus] = useState<AffiliateStatus | null>(initialStatus);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRequest() {
    setError(null);
    startTransition(async () => {
      const result = await requestAffiliation(businessId);
      if (result.error) {
        setError(result.error);
      } else {
        setStatus("pending");
        if (result.id) setAffiliateId(result.id);
      }
    });
  }

  function handleWithdraw() {
    if (!affiliateId) return;
    startTransition(async () => {
      await removeAffiliation(affiliateId);
      setStatus(null);
      setAffiliateId(null);
    });
  }

  if (status === "active") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
        ✓ Affiliate partner
      </span>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          Request pending
        </span>
        {affiliateId && (
          <button
            onClick={handleWithdraw}
            disabled={isPending}
            className="text-xs text-muted hover:text-red-500 disabled:opacity-50"
          >
            Withdraw
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRequest}
        disabled={isPending}
        className="rounded-full border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/5 disabled:opacity-50"
      >
        {isPending ? "Requesting…" : "Request to affiliate"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
