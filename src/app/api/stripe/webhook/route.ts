import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { resolveBillingUserId } from "@/lib/stripe/resolve-user";
import type { PaidPlanTier } from "@/lib/types";

function tierFromMetadata(
  metadata: Stripe.Metadata | null,
): { tier: PaidPlanTier; planTier: "pro" | "platinum" | "free" } | null {
  const tier = metadata?.tier;
  if (tier === "pro") return { tier: "pro", planTier: "pro" };
  if (tier === "platinum") return { tier: "platinum", planTier: "platinum" };
  if (tier === "customer_pro") return { tier: "customer_pro", planTier: "pro" };
  return null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin not configured" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
          break;
        }

        const resolved = tierFromMetadata(session.metadata);
        const userId = await resolveBillingUserId(supabase, {
          metadataUserId: session.metadata?.userId,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : session.customer?.id,
        });

        if (!userId || !resolved) break;

        const { error } = await supabase
          .from("profiles")
          .update({
            plan_tier: resolved.planTier,
            plan_started_at: new Date().toISOString(),
            stripe_customer_id:
              typeof session.customer === "string" ? session.customer : session.customer?.id,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id,
          })
          .eq("id", userId);

        if (error) throw error;
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveBillingUserId(supabase, {
          metadataUserId: subscription.metadata?.userId,
          stripeCustomerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id,
        });

        if (!userId) break;

        if (subscription.status === "active" || subscription.status === "trialing") {
          const resolved = tierFromMetadata(subscription.metadata);
          if (resolved) {
            const { error } = await supabase
              .from("profiles")
              .update({
                plan_tier: resolved.planTier,
                stripe_subscription_id: subscription.id,
                stripe_customer_id:
                  typeof subscription.customer === "string"
                    ? subscription.customer
                    : subscription.customer?.id,
              })
              .eq("id", userId);
            if (error) throw error;
          }
        } else {
          const { error } = await supabase
            .from("profiles")
            .update({
              plan_tier: "free",
              stripe_subscription_id: null,
              stripe_customer_id: null,
              plan_started_at: null,
            })
            .eq("id", userId);
          if (error) throw error;
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
