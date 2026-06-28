import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";
import { canAccess } from "@/lib/plans";
import { getMarketingCampaigns } from "@/lib/data/business";
import { getWeeklyPostSchedule, getRecentAutoPostHistory } from "@/lib/actions/pro";
import { MarketingPageClient } from "@/components/marketing-page-client";

export default async function MarketingPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile || !canAccess(profile.planTier, "automatedMarketing")) redirect("/pricing");

  const [schedule, campaigns, postHistory] = await Promise.all([
    getWeeklyPostSchedule(),
    getMarketingCampaigns(userId),
    getRecentAutoPostHistory(8),
  ]);

  return (
    <>
      <PageHeader
        title="Automated Marketing"
        description="Schedule weekly AI-generated posts to your BizList feed and manage campaigns."
      />
      <MarketingPageClient
        initialSchedule={schedule ?? { enabled: false, dayOfWeek: 1, timeUtc: "09:00" }}
        campaigns={campaigns}
        postHistory={postHistory}
      />
      <Link href="/dashboard" className="mt-8 inline-block text-sm text-accent hover:underline">
        ← Back to dashboard
      </Link>
    </>
  );
}
