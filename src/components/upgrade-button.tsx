"use client";

import { upgradeToProPlan } from "@/lib/actions/pro";

export function UpgradeButton() {
  return (
    <form
      action={async () => {
        await upgradeToProPlan();
      }}
      className="w-full"
    >
      <button
        type="submit"
        className="w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Upgrade to Pro
      </button>
    </form>
  );
}
