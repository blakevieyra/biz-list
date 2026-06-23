"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateBusinessAssessment } from "@/lib/ai/assessment";
import { emailAssessmentComplete, emailProUpgrade } from "@/lib/email/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function requireProUser() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, role")
    .eq("id", user.id)
    .single();

  if (profile?.plan_tier !== "pro") {
    throw new Error("Upgrade to Pro to access this feature.");
  }

  return { supabase, user, profile };
}

export async function upgradeToProPlan() {
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase before upgrading." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Could not connect to Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  if (paymentLink) {
    redirect(paymentLink);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      plan_tier: "pro",
      plan_started_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.email) {
    await emailProUpgrade(profile.email, profile.display_name ?? "there");
  }

  revalidatePath("/", "layout");
  redirect("/pro");
}

export async function runAiAssessment(input: {
  websiteUrl: string;
  businessName: string;
  category: string;
  description: string;
  city: string;
  state: string;
  tagline: string;
}) {
  if (!isSupabaseConfigured()) {
    const result = generateBusinessAssessment(input);
    return { success: true, assessment: { ...result, id: "demo" } };
  }

  try {
    const { supabase, user } = await requireProUser();

    const result = generateBusinessAssessment(input);

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("ai_assessments")
      .insert({
        user_id: user.id,
        business_id: business?.id ?? null,
        website_url: input.websiteUrl,
        business_name: input.businessName,
        category: input.category,
        overall_score: result.overallScore,
        seo_score: result.seoScore,
        online_presence_score: result.onlinePresenceScore,
        business_clarity_score: result.businessClarityScore,
        summary: result.summary,
        recommendations: result.recommendations,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .single();

    if (profile?.email) {
      await emailAssessmentComplete(
        profile.email,
        profile.display_name ?? "there",
        result.overallScore,
      );
    }

    revalidatePath("/pro/assessment");
    return { success: true, assessment: { ...result, id: data.id } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Assessment failed." };
  }
}

export async function contactLead(leadUserId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Connect Supabase to message leads.");
  }

  await requireProUser();
  const { getOrCreateConversation } = await import("@/lib/actions/social");
  const result = await getOrCreateConversation(leadUserId);
  if (result.error) throw new Error(result.error);
  if (!result.conversationId) throw new Error("Could not start conversation.");
  redirect(`/messages/${result.conversationId}`);
}
