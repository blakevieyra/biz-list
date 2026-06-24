"use client";

import { useState, useTransition } from "react";
import { submitJobApplication } from "@/lib/actions/business";

export function JobApplySection({
  businessId,
  businessName,
  isHiring,
  currentUserId,
  isOwner,
}: {
  businessId: string;
  businessName: string;
  isHiring: boolean;
  currentUserId: string | null;
  isOwner: boolean;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!isHiring || isOwner) return null;

  function handleApply() {
    if (!currentUserId) {
      window.location.href = "/auth/login";
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await submitJobApplication({ businessId, message });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setMessage("");
    });
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <h3 className="font-semibold text-emerald-900">Apply at {businessName}</h3>
      <p className="mt-1 text-sm text-emerald-800/80">
        This business is hiring. Introduce yourself and share why you&apos;re a good fit.
      </p>
      {success ? (
        <p className="mt-3 text-sm font-medium text-emerald-800">
          Application sent. The business owner can message you back on BizList.
        </p>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Tell them about your experience and availability..."
            className="mt-3 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending}
            onClick={handleApply}
            className="mt-3 min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Sending..." : "Submit application"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
