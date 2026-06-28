import type { ReactNode } from "react";
import type { BusinessIntent, ForumCategory } from "@/lib/types";
import { FORUM_CATEGORY_LABELS, INTENT_LABELS } from "@/lib/types";

const intentStyles: Record<BusinessIntent, string> = {
  hiring: "bg-violet-100 text-violet-800",
  seeking_customers: "bg-sky-100 text-sky-800",
  seeking_advice: "bg-amber-100 text-amber-800",
  open_to_partnerships: "bg-emerald-100 text-emerald-800",
  b2b: "bg-blue-100 text-blue-800",
  contract: "bg-orange-100 text-orange-800",
  proposal: "bg-teal-100 text-teal-800",
};

const categoryStyles: Record<ForumCategory, string> = {
  general: "bg-slate-100 text-slate-700",
  lessons_learned: "bg-rose-100 text-rose-800",
  local: "bg-teal-100 text-teal-800",
  hiring: "bg-violet-100 text-violet-800",
  partnerships: "bg-emerald-100 text-emerald-800",
  marketing: "bg-orange-100 text-orange-800",
  tech_tools: "bg-blue-100 text-blue-800",
  business_tips: "bg-amber-100 text-amber-800",
  events: "bg-purple-100 text-purple-800",
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
      {action && <div className="w-full shrink-0 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
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

export function formatPostDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function StarRating({
  rating,
  count,
  size = "sm",
  compact = false,
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
}) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));
  const textSize = compact ? "text-xs" : size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 font-semibold text-amber-800 ${
        compact
          ? "text-xs"
          : `rounded-full bg-amber-50 px-2 py-0.5 ${textSize}`
      }`}
      aria-label={`${rating.toFixed(1)} out of 5 stars${count ? `, ${count} reviews` : ""}`}
    >
      <span aria-hidden className={compact ? "text-[10px] tracking-tighter" : "tracking-tight"}>
        {"★".repeat(filled)}
        {"☆".repeat(5 - filled)}
      </span>
      {count !== undefined && count > 0 ? (
        <span className={compact ? "text-[10px] font-medium text-muted" : "text-xs font-medium"}>
          ({count})
        </span>
      ) : null}
    </span>
  );
}
