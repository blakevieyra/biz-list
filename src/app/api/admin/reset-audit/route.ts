import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/actions/auth";

const OWNER_EMAIL = "blake.vieyra@gmail.com";

export async function POST(req: Request) {
  // Only the owner can call this
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Admin client unavailable" }, { status: 503 });

  const callerId = await getAuthUserId();
  if (!callerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await admin.auth.admin.getUserById(callerId);
  if (callerProfile?.user?.email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = (await req.json()) as { email?: string };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Look up the user by email
  const { data: users } = await admin.auth.admin.listUsers();
  const target = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!target) return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });

  // Delete this month's audit records for the target user
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
    userId: target.id,
    email: target.email,
    deletedCount: count ?? 0,
    message: `Reset ${count ?? 0} audit record(s) for ${target.email}`,
  });
}
