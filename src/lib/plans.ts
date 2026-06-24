import type { PlanTier } from "@/lib/types";

export const PLAN_PRICES = {
  free: 0,
  pro: { monthly: 49, annual: 470 },
  platinum: { monthly: 99, annual: 950 },
} as const;

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Community",
  basic: "Community",
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
  basic: ["messaging", "networking", "customerLikes", "reviews", ...FREE_BUSINESS_FEATURES],
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

export function annualSavings(tier: "pro" | "platinum"): number {
  const prices = PLAN_PRICES[tier];
  return prices.monthly * 12 - prices.annual;
}
