import type { PlanTier } from "@/lib/types";

export const PLAN_PRICES = {
  free: 0,
  pro: { monthly: 49, annual: 470 },
  platinum: { monthly: 99, annual: 950 },
  customerPro: { monthly: 12.99, annual: 99.99 },
} as const;

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Community",
  pro: "Pro",
  platinum: "Platinum",
};

export type PlanFeature =
  | "directoryListing"
  | "businessPosts"
  | "messaging"
  | "networking"
  | "workGroups"
  | "servicesListing"
  | "customerLikes"
  | "reviews"
  | "localLeads"
  | "aiAudit"
  | "trendingBoost"
  | "automatedMarketing"
  | "virtualAgent";

export type CustomerPlanFeature =
  | "jobAlerts"
  | "businessMatches"
  | "firstPickDeals"
  | "eventNotifications";

const FREE_BUSINESS_FEATURES: PlanFeature[] = [
  "directoryListing",
  "businessPosts",
  "messaging",
  "networking",
  "workGroups",
  "servicesListing",
  "customerLikes",
  "reviews",
];

const FEATURE_MATRIX: Record<PlanTier, PlanFeature[]> = {
  free: ["messaging", "networking", "customerLikes", "reviews", ...FREE_BUSINESS_FEATURES],
  pro: [...FREE_BUSINESS_FEATURES, "localLeads", "aiAudit", "trendingBoost"],
  platinum: [
    ...FREE_BUSINESS_FEATURES,
    "localLeads",
    "aiAudit",
    "trendingBoost",
    "automatedMarketing",
    "virtualAgent",
  ],
};

export function canAccess(plan: PlanTier, feature: PlanFeature): boolean {
  return FEATURE_MATRIX[plan]?.includes(feature) ?? false;
}

export function isBusinessPlan(plan: PlanTier): boolean {
  return plan === "pro" || plan === "platinum";
}

export function isCustomerPro(plan: PlanTier): boolean {
  return plan === "pro" || plan === "platinum";
}

/** AllConnect Plus perks (alerts, deals, events) — included with Pro/Platinum for any account type. */
export const hasAllConnectPlusPerks = isCustomerPro;

const CUSTOMER_PRO_FEATURES: CustomerPlanFeature[] = [
  "jobAlerts",
  "businessMatches",
  "firstPickDeals",
  "eventNotifications",
];

export function canAccessCustomerFeature(
  plan: PlanTier,
  feature: CustomerPlanFeature,
): boolean {
  if (!hasAllConnectPlusPerks(plan)) return false;
  return CUSTOMER_PRO_FEATURES.includes(feature);
}

export function planRank(plan: PlanTier): number {
  if (plan === "pro") return 1;
  if (plan === "platinum") return 2;
  return 0;
}

export function hasMinPlan(current: PlanTier, required: PlanTier): boolean {
  return planRank(current) >= planRank(required);
}

export function canUseDashboard(_plan: PlanTier): boolean {
  return true;
}

export function annualSavings(tier: "pro" | "platinum" | "customerPro"): number {
  const prices = PLAN_PRICES[tier];
  return Math.round((prices.monthly * 12 - prices.annual) * 100) / 100;
}

export function formatPlanPrice(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2);
}

export const ALLCONNECT_PLUS_LABEL = "AllConnect Plus";
export const CUSTOMER_PRO_LABEL = ALLCONNECT_PLUS_LABEL;

export const ALLCONNECT_PLUS_FEATURES = [
  "Job alerts and business matches based on your skills and interests",
  "First pick on deals, sales, and new product releases",
  "Notifications when followed businesses publish local events",
  "Everything in free Community membership",
] as const;