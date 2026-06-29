export const EVENT_PURPOSE_OPTIONS = [
  "Fundraiser",
  "Outreach",
  "Sales event",
  "Networking",
  "Workshop",
  "Community",
  "Product launch",
  "Entertainment",
] as const;

export type EventPurpose = (typeof EVENT_PURPOSE_OPTIONS)[number];

export function isEventPurpose(value: string): value is EventPurpose {
  return (EVENT_PURPOSE_OPTIONS as readonly string[]).includes(value);
}
