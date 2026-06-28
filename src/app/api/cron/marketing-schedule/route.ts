import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateFreshAutomatedPostAI } from "@/lib/ai/ai-services";
import type { BusinessProfile } from "@/lib/types";
import type { AgentAutomations } from "@/lib/actions/pro";

export const maxDuration = 120;

// Vercel Cron — runs daily at 9am UTC.
// Registered in vercel.json:
//   { "crons": [{ "path": "/api/cron/marketing-schedule", "schedule": "0 9 * * *" }] }
//
// Set CRON_SECRET env var in Vercel to secure this endpoint.

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

  const now = new Date();
  const todayDayOfWeek = now.getUTCDay(); // 0=Sun … 6=Sat
  const todayHHMM = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

  // Fetch every business that has automations configured
  const { data: businesses } = await admin
    .from("businesses")
    .select("id, name, category, subcategory, tagline, description, city, state, owner_id, media_urls, services, is_hiring, agent_automations");

  if (!businesses?.length) {
    return NextResponse.json({ published: 0, checked: 0 });
  }

  let published = 0;

  for (const biz of businesses) {
    try {
      const automations = (biz.agent_automations ?? {}) as AgentAutomations;
      const schedule = automations.weeklyFeedPosts;

      if (!schedule?.enabled) continue;

      // Only run on the configured day of week
      if (schedule.dayOfWeek !== todayDayOfWeek) continue;

      // Only run within a 30-minute window of the configured time
      const [schedH, schedM] = (schedule.timeUtc || "09:00").split(":").map(Number);
      const schedMinutesFromMidnight = schedH * 60 + schedM;
      const nowMinutesFromMidnight = now.getUTCHours() * 60 + now.getUTCMinutes();
      if (Math.abs(nowMinutesFromMidnight - schedMinutesFromMidnight) > 30) continue;

      // Avoid double-posting: skip if already posted in last 6 days
      if (schedule.lastPostedAt) {
        const lastMs = new Date(schedule.lastPostedAt).getTime();
        if (now.getTime() - lastMs < 6 * 24 * 60 * 60 * 1000) continue;
      }

      // Build a minimal BusinessProfile for the AI generator
      const bizProfile: Partial<BusinessProfile> = {
        id: biz.id,
        name: biz.name,
        category: biz.category ?? "",
        subcategory: biz.subcategory ?? "",
        tagline: biz.tagline ?? "",
        description: biz.description ?? "",
        city: biz.city ?? "",
        state: biz.state ?? "",
        isHiring: biz.is_hiring ?? false,
        mediaUrls: Array.isArray(biz.media_urls) ? biz.media_urls : [],
        services: Array.isArray(biz.services) ? biz.services : [],
      };

      const draft = await generateFreshAutomatedPostAI(bizProfile as BusinessProfile);
      if (!draft?.title || !draft?.body) continue;

      // Publish to the feed
      const { error: postErr } = await admin.from("business_posts").insert({
        business_id: biz.id,
        author_id: biz.owner_id,
        post_type: draft.postType,
        title: draft.title,
        body: draft.body,
        media_urls: bizProfile.mediaUrls?.slice(0, 1) ?? [],
        engagement_score: 5,
        is_trending: false,
      });

      if (postErr) {
        console.error("[cron] post insert failed:", biz.id, postErr.message);
        continue;
      }

      // Log to marketing_campaigns for history
      await admin.from("marketing_campaigns").insert({
        user_id: biz.owner_id,
        business_id: biz.id,
        title: draft.title,
        channel: "social",
        content: draft.body,
        status: "sent",
        scheduled_for: now.toISOString(),
      });

      // Update lastPostedAt
      automations.weeklyFeedPosts!.lastPostedAt = now.toISOString();
      await admin
        .from("businesses")
        .update({ agent_automations: automations })
        .eq("id", biz.id);

      // Notify business owner
      await admin.from("notifications").insert({
        user_id: biz.owner_id,
        type: "connection",
        title: "Weekly post published",
        body: `Your automated post "${draft.title}" is now live on the BizList feed.`,
        link: `/listings/${biz.id}`,
        read: false,
      });

      published += 1;
      console.log(`[cron] published post for ${biz.name} (${biz.id}): "${draft.title}"`);
    } catch (e) {
      console.error("[cron/marketing-schedule] error for business", biz.id, e);
    }
  }

  return NextResponse.json({
    published,
    checked: businesses.length,
    day: todayDayOfWeek,
    time: todayHHMM,
    ran: now.toISOString(),
  });
}
