"use client";

import Link from "next/link";
import { getErrorReference, getPublicErrorMessage } from "@/lib/security/error-message";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = getPublicErrorMessage(
    error,
    "Could not load this section. Please try again.",
  );
  const reference = getErrorReference(error);

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <h2 className="font-semibold text-red-900">Dashboard error</h2>
      <p className="mt-2 text-sm text-red-800">{message}</p>
      {reference && (
        <p className="mt-2 text-xs text-red-700/80">Reference: {reference}</p>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white"
        >
          Retry
        </button>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-5 py-2.5 text-sm"
        >
          Overview
        </Link>
      </div>
    </div>
  );
}
