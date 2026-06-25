export const SERVICE_TYPE_OPTIONS = [
  "Product",
  "Service",
  "Food & drink",
  "Retail",
  "Digital",
  "Event / experience",
  "Subscription",
  "Other",
] as const;

export type ServiceType = (typeof SERVICE_TYPE_OPTIONS)[number];

export function isServiceType(value: string): value is ServiceType {
  return (SERVICE_TYPE_OPTIONS as readonly string[]).includes(value);
}

export function normalizeServiceType(value: string | undefined): ServiceType | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  if (isServiceType(trimmed)) return trimmed;
  const match = SERVICE_TYPE_OPTIONS.find((t) => t.toLowerCase() === trimmed.toLowerCase());
  return match;
}

export function offeringActionLabel(serviceType?: string, compact = false): string {
  const normalized = normalizeServiceType(serviceType);
  if (normalized === "Service" || normalized === "Event / experience") {
    return compact ? "Book" : "Book now";
  }
  if (normalized === "Other") {
    return compact ? "See more" : "See more";
  }
  return compact ? "Order" : "Place order";
}
