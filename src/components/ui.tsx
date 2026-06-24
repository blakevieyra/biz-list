import type { ReactNode } from "react";
import type { BusinessIntent, ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS, INTENT_LABELS } from "@/lib/types";

const intentStyles: Record<BusinessIntent, string> = {
  hiring: "bg-violet-100 text-violet-800",
  seeking_customers: "bg-sky-100 text-sky-800",
  seeking_advice: "bg-amber-100 text-amber-800",
  open_to_partnerships: "bg-emerald-100 text-emerald-800",
};

const categoryStyles: Record<ForumCategory, string> = {
  general: "bg-slate-100 text-slate-700",
  legal_lessons: "bg-rose-100 text-rose-800",
  local: "bg-teal-100 text-teal-800",
  hiring: "bg-violet-100 text-violet-800",
  partnerships: "bg-emerald-100 text-emerald-800",
};

export function IntentBadge({ intent }: { intent: BusinessIntent }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${intentStyles[intent]}`}
    >
      {INTENT_LABELS[intent]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: ForumCategory }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyles[category]}`}
    >
      {FORUM_CATEGORY_LABELS[category]}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
