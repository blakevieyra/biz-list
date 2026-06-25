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
  if (normalized === "Event / experience") {
    return compact ? "RSVP" : "RSVP now";
  }
  if (normalized === "Service") {
    return compact ? "Book" : "Book now";
  }
  if (normalized === "Other" || !normalized) {
    return "Learn more";
  }
  return compact ? "Order" : "Place order";
}

export function offeringFormTitle(serviceType?: string, serviceName?: string): string {
  const normalized = normalizeServiceType(serviceType);
  const name = serviceName ?? "this offering";
  if (normalized === "Event / experience") {
    return `RSVP for ${name}`;
  }
  if (normalized === "Service") {
    return `Book ${name}`;
  }
  if (normalized === "Other" || !normalized) {
    return `Learn more about ${name}`;
  }
  return `Order ${name}`;
}

export function offeringSubmitLabel(serviceType?: string): string {
  const normalized = normalizeServiceType(serviceType);
  if (normalized === "Event / experience") {
    return "Send RSVP request";
  }
  if (normalized === "Service") {
    return "Send booking request";
  }
  if (normalized === "Other" || !normalized) {
    return "Send inquiry";
  }
  return "Submit order";
}
