"use client";

import { useState, useTransition } from "react";
import { submitServiceOrder } from "@/lib/actions/business";
import type { BusinessService } from "@/lib/types";
import { SafeExternalLink } from "@/components/safe-external-link";

export function ServiceListing({
  service,
  businessId,
  businessWebsite,
  currentUserId,
  isOwner,
}: {
  service: BusinessService;
  businessId: string;
  businessWebsite?: string;
  currentUserId: string | null;
  isOwner: boolean;
}) {
  const actionType =
    service.actionType ?? (service.actionUrl ? "link" : service.actionLabel ? "form" : undefined);

  if (actionType === "link" && service.actionUrl) {
    return (
      <SafeExternalLink
        url={service.actionUrl}
        label={service.actionLabel || "Buy / order online"}
        className="mt-3 inline-flex min-h-10 items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      />
    );
  }

  if (actionType === "form" && !isOwner) {
    return (
      <ServiceOrderForm
        businessId={businessId}
        serviceName={service.name}
        buttonLabel={service.actionLabel || "Place order"}
        currentUserId={currentUserId}
      />
    );
  }

  if (businessWebsite && !isOwner) {
    return (
      <SafeExternalLink
        url={businessWebsite}
        label="Visit website to order"
        className="mt-3 inline-flex min-h-10 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
      />
    );
  }

  return null;
}

function ServiceOrderForm({
  businessId,
  serviceName,
  buttonLabel,
  currentUserId,
}: {
  businessId: string;
  serviceName: string;
  buttonLabel: string;
  currentUserId: string | null;
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
      <p className="mt-3 text-sm font-medium text-emerald-700">
        Order sent. The business will follow up with you on BizList.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 min-h-10 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-slate-50 p-3">
      <input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Quantity or size (optional)"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Describe what you need, pickup/delivery preferences, etc."
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="min-h-10 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Sending..." : "Submit order"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-10 rounded-full border border-border px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
