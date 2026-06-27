import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateMarketingCampaignDraftAI } from "@/lib/ai/ai-services";
import type { BusinessProfile } from "@/lib/types";

export const maxDuration = 120;

// Vercel Cron — runs daily at 9am UTC.
// Registered in vercel.json:
//   { "crons": [{ "path": "/api/cron/marketing-schedule", "schedule": "0 9 * * *" }] }
//
// Set CRON_SECRET env var in Vercel to secure the endpoint.

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const dayOfMonth = today.getDate();

  // Fetch all businesses with marketingSchedule enabled
  const { data: businesses } = await admin
    .from("businesses")
    .select("id, name, category, owner_id, agent_automations");

  if (!businesses?.length) {
    return NextResponse.json({ queued: 0 });
  }

  let queued = 0;

  for (const biz of businesses) {
    try {
      const automations = (biz.agent_automations ?? {}) as {
        marketingSchedule?: { enabled?: boolean; frequency?: "daily" | "weekly" | "monthly" };
      };

      const schedule = automations.marketingSchedule;
      if (!schedule?.enabled) continue;

      const shouldRun =
        schedule.frequency === "daily" ||
        (schedule.frequency === "weekly" && dayOfWeek === 1) || // Mondays
        (schedule.frequency === "monthly" && dayOfMonth === 1);

      if (!shouldRun) continue;

      // Rotate channels: social on Mon/Thu, email on Wed, local on Sat
      const channel = ([1, 4].includes(dayOfWeek) ? "social" : dayOfWeek === 3 ? "email" : "local") as
        "email" | "social" | "local";

      const draft = await generateMarketingCampaignDraftAI(
        { id: biz.id, name: biz.name, category: biz.category } as BusinessProfile,
        channel,
      );

      if (!draft?.content) continue;

      await admin.from("marketing_campaigns").insert({
        user_id: biz.owner_id,
        business_id: biz.id,
        title: draft.title || `Auto-generated ${channel} post`,
        channel,
        content: draft.content,
        status: "draft",
      });

      queued += 1;
    } catch (e) {
      console.error("[cron/marketing-schedule] error for business", biz.id, e);
    }
  }

  return NextResponse.json({ queued, ran: today.toISOString() });
}
