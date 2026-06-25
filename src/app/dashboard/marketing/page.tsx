import Link from "next/link";
import { redirect } from "next/navigation";
import { createMarketingCampaign, generatePlatinumMarketingDraft } from "@/lib/actions/pro";
import { Card, PageHeader } from "@/components/ui";
import { getMarketingCampaigns } from "@/lib/data/business";
import { getCurrentProfile } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";
import { canAccess } from "@/lib/plans";

async function generateDraftAction() {
  "use server";
  await generatePlatinumMarketingDraft("email");
  redirect("/dashboard/marketing");
}

async function createCampaignAction(formData: FormData) {
  "use server";
  await createMarketingCampaign({
    title: String(formData.get("title") ?? ""),
    channel: String(formData.get("channel") ?? "email"),
    content: String(formData.get("content") ?? ""),
    scheduledFor: String(formData.get("scheduledFor") ?? "") || undefined,
  });
  redirect("/dashboard/marketing");
}

export default async function MarketingPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile || !canAccess(profile.planTier, "automatedMarketing")) redirect("/pricing");

  const campaigns = await getMarketingCampaigns(userId);

  return (
    <>
      <PageHeader
        title="Automated Marketing"
        description="Draft and schedule email and social campaigns tailored to your business profile."
      />

      <Card>
        <h2 className="font-semibold">Create campaign</h2>
        <p className="mt-1 text-sm text-muted">
          Draft campaigns manually or generate one from your business profile with AI.
        </p>
        <form action={generateDraftAction} className="mt-3">
          <button
            type="submit"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Generate email campaign from profile
          </button>
        </form>
        <form action={createCampaignAction} className="mt-4 space-y-3">
          <input
            name="title"
            required
            placeholder="Campaign title"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <select name="channel" className="w-full rounded-lg border border-border px-3 py-2 text-sm">
            <option value="email">Email</option>
            <option value="social">Social</option>
            <option value="local">Local promotion</option>
          </select>
          <textarea
            name="content"
            required
            rows={5}
            placeholder="Campaign message — we'll personalize this using your business profile."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <input
            name="scheduledFor"
            type="datetime-local"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Save campaign
          </button>
        </form>
      </Card>

      <div className="mt-8 space-y-4">
        <h2 className="font-semibold">Your campaigns</h2>
        {campaigns.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No campaigns yet. Create your first automated outreach.</p>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{campaign.title}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{campaign.status}</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-accent">
                  {campaign.channel}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{campaign.content}</p>
            </Card>
          ))
        )}
      </div>

      <Link href="/dashboard" className="mt-6 inline-block text-sm text-accent hover:underline">
        ← Back to dashboard
      </Link>
    </>
  );
}
