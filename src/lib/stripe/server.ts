import Stripe from "stripe";
import type { BillingInterval, PaidPlanTier } from "@/lib/types";
import { getAppUrl } from "@/lib/email/config";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export function getStripePriceId(tier: PaidPlanTier, interval: BillingInterval): string | null {
  const map: Record<PaidPlanTier, Record<BillingInterval, string | undefined>> = {
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    },
    platinum: {
      monthly: process.env.STRIPE_PRICE_PLATINUM_MONTHLY,
      annual: process.env.STRIPE_PRICE_PLATINUM_ANNUAL,
    },
    customer_pro: {
      monthly: process.env.STRIPE_PRICE_CUSTOMER_PLUS_MONTHLY,
      annual: process.env.STRIPE_PRICE_CUSTOMER_PLUS_ANNUAL,
    },
  };
  return map[tier][interval] ?? null;
}

export async function createCheckoutSession(input: {
  tier: PaidPlanTier;
  interval: BillingInterval;
  userId: string;
  email: string;
  stripeCustomerId?: string;
}) {
  const stripe = getStripe();
  const priceId = getStripePriceId(input.tier, input.interval);
  if (!priceId) {
    throw new Error(`Stripe price not configured for ${input.tier} (${input.interval}).`);
  }

  const appUrl = getAppUrl();

  return stripe.checkout.sessions.create({
    mode: "subscription",
    ...(input.stripeCustomerId
      ? { customer: input.stripeCustomerId }
      : { customer_email: input.email }),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}${input.tier === "customer_pro" ? "/home?upgraded=customer_pro" : `/dashboard?upgraded=${input.tier}`}`,
    cancel_url: `${appUrl}/pricing?canceled=1`,
    metadata: {
      userId: input.userId,
      tier: input.tier,
      interval: input.interval,
    },
    subscription_data: {
      metadata: {
        userId: input.userId,
        tier: input.tier,
        interval: input.interval,
      },
    },
  });
}

export async function createBillingPortalSession(customerId: string) {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/dashboard`,
  });
}
