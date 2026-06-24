"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateServiceOrderStatus } from "@/lib/actions/business";
import { Card } from "@/components/ui";
import type { ServiceOrder } from "@/lib/types";

const STATUS_LABELS: Record<ServiceOrder["status"], string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  accepted: "Accepted",
  declined: "Declined",
};

export function ServiceOrdersPanel({
  orders,
  businessId,
}: {
  orders: ServiceOrder[];
  businessId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatus(orderId: string, status: "reviewed" | "accepted" | "declined") {
    setError(null);
    startTransition(async () => {
      const result = await updateServiceOrderStatus({ orderId, businessId, status });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

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
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <ul className="mt-4 space-y-4">
        {orders.map((order) => (
          <li key={order.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{order.serviceName}</p>
                <Link
                  href={`/listings/people/${order.customerId}`}
                  className="text-sm text-accent hover:underline"
                >
                  {order.customerName}
                </Link>
                <p className="mt-1 text-xs text-muted">{STATUS_LABELS[order.status]}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["reviewed", "accepted", "declined"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={pending || order.status === status}
                    onClick={() => handleStatus(order.id, status)}
                    className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                      order.status === status
                        ? "bg-accent text-white"
                        : "border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
            {order.quantity && (
              <p className="mt-2 text-sm">
                <span className="font-medium">Quantity:</span> {order.quantity}
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{order.message}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
