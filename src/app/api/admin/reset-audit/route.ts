import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const OWNER_EMAILS = ["blake.vieyra@gmail.com", "blakevieyra@gmail.com"];

export async function POST(req: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Admin client unavailable" }, { status: 503 });

  // Get the caller's email from their live session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!OWNER_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: `Forbidden — caller email: ${user.email}` }, { status: 403 });
  }

  const { email } = (await req.json()) as { email?: string };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Look up the target user by email
  const { data: users } = await admin.auth.admin.listUsers();
  const target = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!target) return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });

  // Delete this month's audit records
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await admin
    .from("business_audits")
    .delete({ count: "exact" })
    .eq("user_id", target.id)
    .gte("created_at", startOfMonth.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    callerEmail: user.email,
    targetEmail: target.email,
    deletedCount: count ?? 0,
    message: `Reset ${count ?? 0} audit record(s) for ${target.email}`,
  });
}
