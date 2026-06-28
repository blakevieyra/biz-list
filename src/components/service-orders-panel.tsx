"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateServiceOrderStatus, getOrderConversationId } from "@/lib/actions/business";
import { Card } from "@/components/ui";
import type { ServiceOrder } from "@/lib/types";

type OrderStatus = ServiceOrder["status"];

const WORKFLOW: { status: OrderStatus; label: string; color: string }[] = [
  { status: "pending",     label: "Pending",     color: "bg-slate-200 text-slate-700" },
  { status: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800" },
  { status: "shipped",     label: "Shipped",     color: "bg-violet-100 text-violet-800" },
  { status: "complete",    label: "Complete",    color: "bg-emerald-100 text-emerald-800" },
];

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending:     "bg-slate-100 text-slate-600",
  reviewed:    "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-800",
  accepted:    "bg-blue-100 text-blue-800",
  shipped:     "bg-violet-100 text-violet-800",
  complete:    "bg-emerald-100 text-emerald-800",
  declined:    "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:     "Pending",
  reviewed:    "Pending",
  in_progress: "In Progress",
  accepted:    "In Progress",
  shipped:     "Shipped",
  complete:    "Complete",
  declined:    "Declined",
};

function workflowIndex(status: OrderStatus): number {
  if (status === "in_progress" || status === "accepted") return 1;
  if (status === "shipped") return 2;
  if (status === "complete") return 3;
  if (status === "declined") return -1;
  return 0;
}

function OrderCard({ order, businessId }: { order: ServiceOrder; businessId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(order.noteText ?? "");
  const [editNote, setEditNote] = useState(false);
  const [messagePending, startMessageTransition] = useTransition();

  const currentIdx = workflowIndex(order.status);
  const isDeclined = order.status === "declined";

  function setStatus(status: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateServiceOrderStatus({
        orderId: order.id,
        businessId,
        status,
        noteText: note || undefined,
      });
      if (result.error) { setError(result.error); return; }
      router.refresh();
    });
  }

  function saveNote() {
    setError(null);
    startTransition(async () => {
      const result = await updateServiceOrderStatus({
        orderId: order.id,
        businessId,
        status: order.status,
        noteText: note,
      });
      if (result.error) { setError(result.error); return; }
      setEditNote(false);
      router.refresh();
    });
  }

  function openMessage() {
    startMessageTransition(async () => {
      const result = await getOrderConversationId({
        customerId: order.customerId,
        businessId,
      });
      if (result.conversationId) {
        router.push(`/messages/${result.conversationId}`);
      }
    });
  }

  return (
    <li className="rounded-xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-base">{order.serviceName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={`/listings/people/${order.customerId}`}
              className="text-accent hover:underline font-medium"
            >
              {order.customerName}
            </Link>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status]}`}>
              {STATUS_LABEL[order.status]}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Ordered {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <button
          type="button"
          disabled={messagePending}
          onClick={openMessage}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40 hover:text-accent disabled:opacity-50"
        >
          {messagePending ? "Opening…" : "Message customer"}
        </button>
      </div>

      {order.quantity && (
        <p className="text-sm">
          <span className="font-medium">Qty:</span> {order.quantity}
        </p>
      )}
      {order.message && (
        <p className="text-sm text-muted whitespace-pre-wrap">{order.message}</p>
      )}

      {/* Workflow steps */}
      {!isDeclined && (
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-0">
            {WORKFLOW.map((step, i) => {
              const done = currentIdx > i;
              const active = currentIdx === i;
              return (
                <div key={step.status} className="flex items-center">
                  <button
                    type="button"
                    disabled={pending || active || done}
                    onClick={() => setStatus(step.status)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition
                      ${active ? step.color + " ring-2 ring-offset-1 ring-accent/30" : ""}
                      ${done ? "bg-emerald-50 text-emerald-700 cursor-default" : ""}
                      ${!active && !done ? "border border-border text-muted hover:border-accent/40 hover:text-foreground" : ""}
                      disabled:cursor-default`}
                  >
                    <span className="text-lg">{done ? "✓" : active ? "●" : "○"}</span>
                    {step.label}
                  </button>
                  {i < WORKFLOW.length - 1 && (
                    <div className={`h-px w-6 ${done ? "bg-emerald-400" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
            <div className="flex items-center">
              <div className={`h-px w-6 ${isDeclined ? "bg-red-300" : "bg-border"}`} />
              <button
                type="button"
                disabled={pending || isDeclined}
                onClick={() => setStatus("declined")}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition
                  ${isDeclined ? "border-red-300 bg-red-50 text-red-700 cursor-default" : "border-border text-muted hover:border-red-300 hover:text-red-600"}
                  disabled:cursor-default`}
              >
                <span className="text-lg block text-center">✕</span>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {isDeclined && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Order declined</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus("pending")}
            className="text-xs text-accent hover:underline disabled:opacity-50"
          >
            Reopen
          </button>
        </div>
      )}

      {/* Note */}
      <div className="border-t border-border pt-3">
        {editNote ? (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note for the customer (optional)…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={saveNote}
                className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Save note
              </button>
              <button
                type="button"
                onClick={() => { setNote(order.noteText ?? ""); setEditNote(false); }}
                className="text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted">
              {order.noteText ? order.noteText : <span className="italic">No note for customer.</span>}
            </p>
            <button
              type="button"
              onClick={() => setEditNote(true)}
              className="shrink-0 text-xs text-accent hover:underline"
            >
              {order.noteText ? "Edit note" : "Add note"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </li>
  );
}

export function ServiceOrdersPanel({
  orders,
  businessId,
}: {
  orders: ServiceOrder[];
  businessId: string;
}) {
  if (!orders.length) {
    return (
      <Card>
        <h2 className="font-semibold">Service orders</h2>
        <p className="mt-2 text-sm text-muted">
          No orders yet. Add services with a custom order form on your listing to receive them.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-semibold">Service orders ({orders.length})</h2>
      <p className="mt-1 text-sm text-muted">Orders placed through your in-app service forms.</p>
      <ul className="mt-4 space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} businessId={businessId} />
        ))}
      </ul>
    </Card>
  );
}
