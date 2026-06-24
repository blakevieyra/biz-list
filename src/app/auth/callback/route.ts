import { NextResponse } from "next/server";
import { emailWelcome } from "@/lib/email/actions";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          const displayName =
            (user.user_metadata?.display_name as string | undefined) ??
            user.email.split("@")[0];
          await emailWelcome(user.email, displayName);
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
