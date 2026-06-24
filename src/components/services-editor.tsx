"use client";

import type { BusinessService } from "@/lib/types";

const emptyService = (): BusinessService => ({
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  actionType: "form",
  actionUrl: "",
  actionLabel: "Place order",
});

export function ServicesEditor({
  services,
  onChange,
}: {
  services: BusinessService[];
  onChange: (services: BusinessService[]) => void;
}) {
  function update(index: number, patch: Partial<BusinessService>) {
    onChange(services.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addService() {
    onChange([...services, emptyService()]);
  }

  function removeService(index: number) {
    onChange(services.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Products & services</p>
        <p className="mt-1 text-xs text-muted">
          List what you sell. Choose an external purchase link or an in-app order form for each item.
        </p>
      </div>

      {services.map((service, index) => {
        const actionType = service.actionType ?? (service.actionUrl ? "link" : "form");
        return (
          <div key={index} className="space-y-3 rounded-xl border border-border p-4">
            <input
              value={service.name}
              onChange={(e) => update(index, { name: e.target.value })}
              placeholder="Product or service name"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <textarea
              value={service.description}
              onChange={(e) => update(index, { description: e.target.value })}
              placeholder="Short description"
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              value={service.price ?? ""}
              onChange={(e) => update(index, { price: e.target.value })}
              placeholder="Price (optional) e.g. $25 / From $99"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              value={service.imageUrl ?? ""}
              onChange={(e) => update(index, { imageUrl: e.target.value })}
              placeholder="Product image URL (optional, https://...)"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />

            <div>
              <p className="text-xs font-medium text-muted">How customers order</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    update(index, {
                      actionType: "form",
                      actionUrl: "",
                      actionLabel: service.actionLabel || "Place order",
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    actionType === "form"
                      ? "bg-accent text-white"
                      : "border border-border text-muted"
                  }`}
                >
                  Custom form on BizList
                </button>
                <button
                  type="button"
                  onClick={() =>
                    update(index, {
                      actionType: "link",
                      actionLabel: service.actionLabel || "Buy now",
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    actionType === "link"
                      ? "bg-accent text-white"
                      : "border border-border text-muted"
                  }`}
                >
                  Link to website / checkout
                </button>
              </div>
            </div>

            {actionType === "link" ? (
              <input
                value={service.actionUrl ?? ""}
                onChange={(e) => update(index, { actionUrl: e.target.value, actionType: "link" })}
                placeholder="Purchase or quote link (https://...)"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            ) : (
              <p className="text-xs text-muted">
                Customers submit order details through a form on your business profile.
              </p>
            )}

            <input
              value={service.actionLabel ?? ""}
              onChange={(e) => update(index, { actionLabel: e.target.value })}
              placeholder={
                actionType === "link"
                  ? "Button label e.g. Buy now / Book online"
                  : "Button label e.g. Place order / Request quote"
              }
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />

            <button
              type="button"
              onClick={() => removeService(index)}
              className="text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addService}
        className="min-h-11 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
      >
        + Add product or service
      </button>
    </div>
  );
}
