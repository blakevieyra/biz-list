"use client";

import { useState, useTransition } from "react";
import { submitServiceOrder } from "@/lib/actions/business";
import type { BusinessService } from "@/lib/types";
import { ContentLikeButton } from "@/components/content-like-button";
import { SafeExternalLink } from "@/components/safe-external-link";

export function ServiceListing({
  service,
  businessId,
  businessWebsite,
  currentUserId,
  isOwner,
  likeCount = 0,
  liked = false,
  compact = false,
}: {
  service: BusinessService;
  businessId: string;
  businessWebsite?: string;
  currentUserId: string | null;
  isOwner: boolean;
  likeCount?: number;
  liked?: boolean;
  compact?: boolean;
}) {
  const actionType =
    service.actionType ?? (service.actionUrl ? "link" : service.actionLabel ? "form" : undefined);
  const orderLabel = compact ? "Order" : service.actionLabel || "Place order";
  const linkLabel = compact ? "Order" : service.actionLabel || "Buy / order online";

  const action = (
    <>
      {!compact && !isOwner && (
        <ContentLikeButton
          businessId={businessId}
          targetType="service"
          targetId={service.name}
          initialCount={likeCount}
          initialLiked={liked}
        />
      )}
      {actionType === "link" && service.actionUrl ? (
        <SafeExternalLink
          url={service.actionUrl}
          label={linkLabel}
          className={
            compact
              ? "inline-flex shrink-0 items-center rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-white hover:bg-accent-hover"
              : "inline-flex min-h-10 items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          }
        />
      ) : actionType === "form" && !isOwner ? (
        <ServiceOrderForm
          businessId={businessId}
          serviceName={service.name}
          buttonLabel={orderLabel}
          currentUserId={currentUserId}
          compact={compact}
        />
      ) : businessWebsite && !isOwner ? (
        <SafeExternalLink
          url={businessWebsite}
          label={compact ? "Order" : "Visit website to order"}
          className={
            compact
              ? "inline-flex shrink-0 items-center rounded-full border border-border px-2.5 py-1 text-[11px] font-medium hover:border-accent/40"
              : "inline-flex min-h-10 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          }
        />
      ) : null}
    </>
  );

  if (compact) {
    return <div className="relative shrink-0">{action}</div>;
  }

  return <div className="flex flex-wrap items-center gap-2">{action}</div>;
}

function ServiceOrderForm({
  businessId,
  serviceName,
  buttonLabel,
  currentUserId,
  compact = false,
}: {
  businessId: string;
  serviceName: string;
  buttonLabel: string;
  currentUserId: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!currentUserId) {
      window.location.href = "/auth/login";
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await submitServiceOrder({
        businessId,
        serviceName,
        message,
        quantity,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setOpen(false);
      setMessage("");
      setQuantity("");
    });
  }

  if (success) {
    return (
      <p className={compact ? "text-[11px] font-medium text-emerald-700" : "text-sm font-medium text-emerald-700"}>
        Order sent.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-white hover:bg-accent-hover"
            : "min-h-10 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        }
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <div className={compact ? "relative" : undefined}>
      <div
        className={
          compact
            ? "absolute right-0 top-full z-10 mt-1 w-56 space-y-2 rounded-lg border border-border bg-white p-2 shadow-lg"
            : "space-y-2 rounded-xl border border-border bg-slate-50 p-3"
        }
      >
      <input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Quantity or size (optional)"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={compact ? 2 : 3}
        placeholder="Notes for the business…"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className={
            compact
              ? "rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              : "min-h-10 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          }
        >
          {pending ? "Sending..." : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={
            compact
              ? "rounded-full border border-border px-2.5 py-1 text-[11px] font-medium"
              : "min-h-10 rounded-full border border-border px-4 py-2 text-sm font-medium"
          }
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
