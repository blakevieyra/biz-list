/** Curated industries used for business listings and customer discovery preferences. */
export const INDUSTRY_OPTIONS = [
  "Food & Beverage",
  "Retail & Community",
  "Professional Services",
  "Health & Wellness",
  "Marketing & Print",
  "Home & Construction",
  "Auto & Transport",
  "Technology",
  "Entertainment & Events",
  "Education & Training",
  "Nonprofit & Community",
] as const;

export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number];
