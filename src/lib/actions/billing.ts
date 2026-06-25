"use server";



import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import {

  createBillingPortalSession,

  createCheckoutSession,

  isStripeConfigured,

} from "@/lib/stripe/server";

import type { BillingInterval, PaidPlanTier } from "@/lib/types";

import { emailProUpgrade } from "@/lib/email/actions";

import { PLAN_LABELS } from "@/lib/plans";



export async function startCheckout(tier: PaidPlanTier, interval: BillingInterval) {

  if (!isSupabaseConfigured()) {

    return { error: "Connect Supabase before upgrading." };

  }



  const supabase = await createClient();

  if (!supabase) return { error: "Could not connect to Supabase." };



  const {

    data: { user },

  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");



  const { data: profile } = await supabase

    .from("profiles")

    .select("display_name, email, role, stripe_customer_id")

    .eq("id", user.id)

    .single();



  if (profile?.role === "customer") {
    if (tier !== "customer_pro") {
      return { error: "Business plans are for business and organization accounts." };
    }
  } else if (tier === "customer_pro") {
    return { error: "AllConnect Plus is for customer accounts." };
  }



  if (isStripeConfigured()) {

    const session = await createCheckoutSession({

      tier,

      interval,

      userId: user.id,

      email: profile?.email ?? user.email ?? "",

      stripeCustomerId: profile?.stripe_customer_id ?? undefined,

    });

    if (session.url) redirect(session.url);

    return { error: "Could not start checkout." };

  }



  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "preview";
  const allowDevBypass =
    !isProduction && process.env.ALLOW_DEV_BILLING_BYPASS === "true";



  if (!allowDevBypass) {

    return { error: "Billing is not configured. Contact support." };

  }



  const admin = getSupabaseAdmin();

  if (!admin) {

    return { error: "Service role required for dev billing bypass." };

  }



  const planTier = tier === "customer_pro" ? "pro" : tier;

  const { error } = await admin

    .from("profiles")

    .update({

      plan_tier: planTier,

      plan_started_at: new Date().toISOString(),

    })

    .eq("id", user.id);



  if (error) return { error: error.message };



  if (profile?.email) {

    const label =
      tier === "customer_pro" ? "AllConnect Plus" : PLAN_LABELS[tier as keyof typeof PLAN_LABELS];
    await emailProUpgrade(profile.email, profile.display_name ?? "there", label);

  }



  revalidatePath("/", "layout");

  redirect(profile?.role === "customer" ? "/home" : "/dashboard");

}



export async function openBillingPortal() {

  const supabase = await createClient();

  if (!supabase || !isStripeConfigured()) {

    return { error: "Billing portal is not available." };

  }



  const {

    data: { user },

  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");



  const { data: profile } = await supabase

    .from("profiles")

    .select("stripe_customer_id")

    .eq("id", user.id)

    .single();



  if (!profile?.stripe_customer_id) {

    return { error: "No active subscription found." };

  }



  const session = await createBillingPortalSession(profile.stripe_customer_id);

  if (session.url) redirect(session.url);

  return { error: "Could not open billing portal." };

}

