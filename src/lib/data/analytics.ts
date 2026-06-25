import { createClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/plans";
import { getCurrentProfile } from "@/lib/data";

export interface DailyViewCount {
  date: string;
  views: number;
}

export interface OfferingClickStat {
  offeringName: string;
  clickType: string;
  count: number;
}

export interface BusinessAnalytics {
  views7d: number;
  views30d: number;
  viewsAllTime: number;
  dailyViews: DailyViewCount[];
  offeringClicks: OfferingClickStat[];
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

export async function getBusinessAnalytics(
  businessId: string,
): Promise<BusinessAnalytics | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const profile = await getCurrentProfile();
  if (!profile || !canAccess(profile.planTier, "analytics")) return null;

  const since30d = daysAgo(30);
  const since7d = daysAgo(7);

  const [viewsAll, views30, clicks30] = await Promise.all([
    supabase
      .from("business_page_views")
      .select("viewed_at")
      .eq("business_id", businessId),
    supabase
      .from("business_page_views")
      .select("viewed_at")
      .eq("business_id", businessId)
      .gte("viewed_at", since30d),
    supabase
      .from("business_offering_clicks")
      .select("offering_name, click_type, clicked_at")
      .eq("business_id", businessId)
      .gte("clicked_at", since30d),
  ]);

  const allViews = viewsAll.data ?? [];
  const recentViews = views30.data ?? [];
  const recentClicks = clicks30.data ?? [];

  const views7d = recentViews.filter((v) => v.viewed_at >= since7d).length;

  // Build daily counts for last 14 days
  const dailyMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dailyMap.set(dateOnly(d.toISOString()), 0);
  }
  for (const v of recentViews) {
    const day = dateOnly(v.viewed_at);
    if (dailyMap.has(day)) {
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }
  }
  const dailyViews: DailyViewCount[] = Array.from(dailyMap.entries()).map(
    ([date, views]) => ({ date, views }),
  );

  // Aggregate offering clicks
  const clickMap = new Map<string, number>();
  for (const c of recentClicks) {
    const key = `${c.offering_name}|||${c.click_type}`;
    clickMap.set(key, (clickMap.get(key) ?? 0) + 1);
  }
  const offeringClicks: OfferingClickStat[] = Array.from(clickMap.entries())
    .map(([key, count]) => {
      const [offeringName, clickType] = key.split("|||");
      return { offeringName, clickType, count };
    })
    .sort((a, b) => b.count - a.count);

  return {
    views7d,
    views30d: recentViews.length,
    viewsAllTime: allViews.length,
    dailyViews,
    offeringClicks,
  };
}
