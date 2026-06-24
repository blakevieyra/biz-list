"use client";

import Link from "next/link";
import { getErrorReference, getPublicErrorMessage } from "@/lib/security/error-message";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = getPublicErrorMessage(
    error,
    "An unexpected error occurred. Please try again.",
  );
  const reference = getErrorReference(error);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">{message}</p>
      {reference && (
        <p className="mt-2 text-xs text-muted">Reference: {reference}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-accent/40"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
