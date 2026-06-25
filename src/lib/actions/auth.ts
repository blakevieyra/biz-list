"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createVerificationToken,
  decryptSignupPassword,
  encryptSignupPassword,
  hashVerificationToken,
} from "@/lib/auth/signup-crypto";
import { emailSignupVerification, emailWelcome } from "@/lib/email/actions";
import { getAppUrl } from "@/lib/email/config";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDisplayNameError, getEmailError, getPasswordError, normalizeEmailInput } from "@/lib/validation/auth-fields";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return normalizeEmailInput(email);
}

async function emailAlreadyRegistered(email: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error } = await admin.rpc("auth_email_exists", {
    check_email: email,
  });

  if (error) {
    console.error("[signup] auth_email_exists", error.message);
    return false;
  }

  return Boolean(data);
}

export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Copy .env.local.example to .env.local." };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { error: "Signup is temporarily unavailable. Please try again later." };
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  const nameError = getDisplayNameError(displayName);
  if (nameError) return { error: nameError };

  const emailError = getEmailError(email);
  if (emailError) return { error: emailError };

  const passwordError = getPasswordError(password);
  if (passwordError) return { error: passwordError };

  if (await emailAlreadyRegistered(email)) {
    return { error: "An account with this email already exists. Try signing in." };
  }

  const { token, hash } = createVerificationToken();
  const { ciphertext, iv } = encryptSignupPassword(password);
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();

  await admin.from("pending_signups").delete().eq("email", email);

  const { error: insertError } = await admin.from("pending_signups").insert({
    email,
    display_name: displayName,
    password_ciphertext: ciphertext,
    password_iv: iv,
    token_hash: hash,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("[signup] pending_signups insert", insertError.message);
    return { error: "Could not start signup. Please try again." };
  }

  const verifyUrl = `${getAppUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;

  await emailSignupVerification(email, displayName, verifyUrl);

  if (process.env.NODE_ENV === "development") {
    console.info("[AllConnect signup verify link]", verifyUrl);
  }

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function resendSignupVerification(emailInput: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { error: "Could not resend verification email." };
  }

  const email = normalizeEmail(emailInput);
  if (!email) return { error: "Email is required." };

  if (await emailAlreadyRegistered(email)) {
    return { error: "This email already has an account. Try signing in." };
  }

  const { data: pending } = await admin
    .from("pending_signups")
    .select("display_name")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) {
    return { error: "No pending signup found. Please sign up again." };
  }

  const { token, hash } = createVerificationToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();

  const { error: updateError } = await admin
    .from("pending_signups")
    .update({ token_hash: hash, expires_at: expiresAt })
    .eq("email", email);

  if (updateError) {
    return { error: "Could not resend verification email." };
  }

  const verifyUrl = `${getAppUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
  await emailSignupVerification(email, pending.display_name, verifyUrl);

  if (process.env.NODE_ENV === "development") {
    console.info("[AllConnect signup verify link]", verifyUrl);
  }

  return { success: true };
}

export async function verifySignupToken(token: string): Promise<
  | { ok: true }
  | { error: "invalid" | "expired" | "exists" | "failed"; email?: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { error: "failed" };
  }

  const tokenHash = hashVerificationToken(token);
  const { data: pending, error: lookupError } = await admin
    .from("pending_signups")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupError || !pending) {
    return { error: "invalid" };
  }

  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return { error: "expired", email: pending.email as string };
  }

  if (await emailAlreadyRegistered(pending.email)) {
    await admin.from("pending_signups").delete().eq("id", pending.id);
    return { error: "exists" };
  }

  let password: string;
  try {
    password = decryptSignupPassword(
      pending.password_ciphertext,
      pending.password_iv,
    );
  } catch {
    return { error: "invalid" };
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email: pending.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: pending.display_name },
  });

  if (createError) {
    console.error("[signup] createUser", createError.message);
    if (createError.message.toLowerCase().includes("already")) {
      return { error: "exists" };
    }
    return { error: "failed" };
  }

  await admin.from("pending_signups").delete().eq("id", pending.id);

  const supabase = await createClient();
  if (!supabase) {
    return { error: "failed" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: pending.email,
    password,
  });

  if (signInError) {
    console.error("[signup] signIn after create", signInError.message);
    return { error: "failed" };
  }

  await emailWelcome(pending.email, pending.display_name);

  return { ok: true };
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Copy .env.local.example to .env.local." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Could not connect to Supabase." };

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  const emailError = getEmailError(email);
  if (emailError) return { error: emailError };

  const passwordError = getPasswordError(password);
  if (passwordError) return { error: passwordError };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Please verify your email first. Check your inbox for the AllConnect verification link.",
      };
    }
    return { error: error.message };
  }

  const user = data.user;
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";

  const createdAt = new Date(user.created_at).getTime();
  const lastSignIn = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).getTime()
    : createdAt;
  const isFirstLogin = Math.abs(lastSignIn - createdAt) < 60_000;

  if (user.email && isFirstLogin) {
    await emailWelcome(user.email, displayName);
  }

  redirect("/home");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function revalidateAppPaths() {
  revalidatePath("/", "layout");
}
