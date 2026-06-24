"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PlanFeature } from "@/lib/plans";

type NavItem = {
  href: string;
  label: string;
  feature?: PlanFeature;
};

export function DashboardNav({
  items,
  enabledFeatures,
}: {
  items: NavItem[];
  enabledFeatures: PlanFeature[];
}) {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {items.map((item) => {
        if (item.feature && !enabledFeatures.includes(item.feature)) return null;

        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "border-accent bg-accent text-white shadow-sm"
                : "border-border bg-card text-foreground hover:border-accent/40"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
