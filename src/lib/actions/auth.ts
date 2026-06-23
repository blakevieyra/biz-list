"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Copy .env.local.example to .env.local." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Could not connect to Supabase." };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) return { error: error.message };

  redirect("/profile/create");
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Copy .env.local.example to .env.local." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Could not connect to Supabase." };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/directory");
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
