"use client";

import { useActionState } from "react";
import { openBillingPortal } from "@/lib/actions/billing";

export function ManageBillingButton() {
  const [state, action, pending] = useActionState(
    async () => {
      const result = await openBillingPortal();
      return { error: result?.error };
    },
    { error: undefined as string | undefined },
  );

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40 disabled:opacity-50"
      >
        {pending ? "Opening..." : "Manage billing"}
      </button>
      {state.error && (
        <p className="mt-1 text-xs text-muted">{state.error}</p>
      )}
    </form>
  );
}
