import type { BusinessProfile, LocalLead } from "@/lib/types";

export function generateAutomatedPost(business: BusinessProfile): {
  title: string;
  body: string;
  postType: "update" | "deal" | "job";
} {
  const location = `${business.city}, ${business.state}`;
  const topService = business.services[0]?.name;

  if (business.isHiring) {
    return {
      postType: "job",
      title: `${business.name} is hiring in ${location}`,
      body: `We're growing our team at ${business.name}. ${business.tagline || business.description.slice(0, 120)} Apply through our AllConnect listing or message us directly.`,
    };
  }

  if (topService) {
    return {
      postType: "deal",
      title: `Featured this week: ${topService}`,
      body: `${business.name} in ${location} is highlighting ${topService}. ${business.services[0]?.description?.slice(0, 140) || business.tagline || "Message us for details."}`,
    };
  }

  return {
    postType: "update",
    title: `Update from ${business.name}`,
    body: `${business.tagline || business.description.slice(0, 160)} Follow us on AllConnect for local updates in ${location}.`,
  };
}

export function generateOutreachMessage(
  business: BusinessProfile,
  lead: Pick<LocalLead, "displayName" | "matchReasons">,
): string {
  const reason = lead.matchReasons[0] ?? "your local interests";
  return `Hi ${lead.displayName.split(" ")[0] || "there"}, this is ${business.name} in ${business.city}. We noticed ${reason.toLowerCase()} and thought our ${business.category.toLowerCase()} offerings might be a fit. Happy to share details or answer questions here on AllConnect.`;
}

export function generateOnboardingWelcome(business: BusinessProfile, customerName: string): string {
  return `Welcome to ${business.name}! Thanks for connecting with us on AllConnect. We serve ${business.city} and nearby areas with ${business.category.toLowerCase()} services. Reply anytime with questions — we're glad you're here, ${customerName.split(" ")[0] || "friend"}.`;
}

export function generateMarketingCampaignDraft(
  business: BusinessProfile,
  channel: "email" | "social" | "local",
): { title: string; content: string } {
  const post = generateAutomatedPost(business);
  if (channel === "email") {
    return {
      title: `${business.name} — ${post.title}`,
      content: `Subject: ${post.title}\n\n${post.body}\n\nVisit our listing: AllConnect.app/listings/${business.id}`,
    };
  }
  if (channel === "social") {
    return {
      title: `Social: ${post.title}`,
      content: `${post.body}\n\n#${business.city.replace(/\s+/g, "")} #ShopLocal #AllConnect`,
    };
  }
  return {
    title: `Local promo: ${business.name}`,
    content: `${post.body}\n\nServing ${business.city}, ${business.state}. Find us on AllConnect.`,
  };
}
