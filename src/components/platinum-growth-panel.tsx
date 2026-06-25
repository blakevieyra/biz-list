"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  automatePlatinumOutreach,
  generatePlatinumPost,
  runPlatinumOnboarding,
} from "@/lib/actions/pro";
import { Card } from "@/components/ui";
import type { PlanTier } from "@/lib/types";
import { canAccess } from "@/lib/plans";

export function PlatinumGrowthPanel({ planTier }: { planTier: PlanTier }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasMarketing = canAccess(planTier, "automatedMarketing");
  const hasAgent = canAccess(planTier, "virtualAgent");

  if (!hasMarketing && !hasAgent) {
    return (
      <Card>
        <h2 className="font-semibold">Platinum AI agent</h2>
        <p className="mt-2 text-sm text-muted">
          Platinum automates marketing outreach, customer onboarding messages, and content posting
          for your business.
        </p>
        <Link href="/pricing" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          Upgrade to Platinum →
        </Link>
      </Card>
    );
  }

  function runAction(action: () => Promise<{ error?: string; message?: string }>) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Done.");
      router.refresh();
    });
  }

  return (
    <Card>
      <h2 className="font-semibold">Platinum AI agent</h2>
      <p className="mt-1 text-sm text-muted">
        Automate posts, outreach to matched leads, and welcome messages for new followers.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {hasMarketing && (
          <button
            type="button"
            disabled={pending}
            onClick={() => runAction(generatePlatinumPost)}
            className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-left text-sm hover:border-accent/40 disabled:opacity-50"
          >
            <span className="font-semibold">Auto-post</span>
            <span className="mt-1 block text-xs text-muted">
              Publish an AI-drafted update to your AllConnect feed.
            </span>
          </button>
        )}
        {hasAgent && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => runAction(automatePlatinumOutreach)}
              className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-left text-sm hover:border-accent/40 disabled:opacity-50"
            >
              <span className="font-semibold">Outreach leads</span>
              <span className="mt-1 block text-xs text-muted">
                Message top matched leads with a personalized intro.
              </span>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runAction(runPlatinumOnboarding)}
              className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-left text-sm hover:border-accent/40 disabled:opacity-50"
            >
              <span className="font-semibold">Welcome followers</span>
              <span className="mt-1 block text-xs text-muted">
                Send onboarding messages to recent followers.
              </span>
            </button>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {hasMarketing && (
          <Link href="/dashboard/marketing" className="text-accent hover:underline">
            Marketing campaigns →
          </Link>
        )}
        {hasAgent && (
          <Link href="/dashboard/agent" className="text-accent hover:underline">
            Virtual agent preview →
          </Link>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
