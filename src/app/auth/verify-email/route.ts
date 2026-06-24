import { NextResponse } from "next/server";
import { verifySignupToken } from "@/lib/actions/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${origin}/auth/check-email?error=invalid`);
  }

  const result = await verifySignupToken(token);

  if (!("ok" in result)) {
    const emailParam = result.email ? `&email=${encodeURIComponent(result.email)}` : "";
    return NextResponse.redirect(
      `${origin}/auth/check-email?error=${result.error}${emailParam}`,
    );
  }

  return NextResponse.redirect(`${origin}/profile/create?welcome=1`);
}
