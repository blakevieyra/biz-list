import type { BusinessProfile, LocalLead } from "@/lib/types";

export type VirtualAgentContext = {
  business: Pick<
    BusinessProfile,
    | "name"
    | "category"
    | "subcategory"
    | "tagline"
    | "description"
    | "city"
    | "state"
    | "phone"
    | "hours"
    | "website"
    | "isHiring"
    | "services"
  > & { importantInfo?: string };
  customerName?: string;
  agentInstructions?: string;
  agentTopicRules?: { topic: string; response: string }[];
};

function serviceSummary(business: VirtualAgentContext["business"]): string {
  const names = business.services.slice(0, 3).map((s) => s.name).filter(Boolean);
  if (!names.length) return business.category.toLowerCase();
  return names.join(", ");
}

function priceHint(business: VirtualAgentContext["business"]): string {
  const priced = business.services.find((s) => s.price?.trim());
  if (priced?.price) return `${priced.name} starts at ${priced.price}`;
  return "Reply with what you need and we can share pricing.";
}

export function generateVirtualAgentReply(
  ctx: VirtualAgentContext,
  message: string,
): string {
  const { business } = ctx;
  const firstName = ctx.customerName?.split(" ")[0] || "there";
  const lower = message.toLowerCase();
  const services = serviceSummary(business);
  const location = [business.city, business.state].filter(Boolean).join(", ");

  if (lower.includes("price") || lower.includes("cost") || lower.includes("rate") || lower.includes("how much")) {
    return `Hi ${firstName}! ${business.name} here. ${priceHint(business)} We offer ${services} in ${location || "your area"}. Tell me what you're looking for and I'll point you to the right option.`;
  }

  if (lower.includes("hour") || lower.includes("open") || lower.includes("when")) {
    const hours = business.hours?.trim()
      ? `Our hours: ${business.hours}.`
      : "Check our BizList listing for current hours.";
    return `Hi ${firstName}! ${hours} We're ${business.category.toLowerCase()} serving ${location}. Anything else I can help with?`;
  }

  if (lower.includes("hire") || lower.includes("job") || lower.includes("work") || lower.includes("apply")) {
    if (business.isHiring) {
      return `Hi ${firstName}! Yes — ${business.name} is hiring in ${location}. ${business.tagline || "Visit our listing to apply or share your background here and our team will follow up."}`;
    }
    return `Hi ${firstName}! We're not actively hiring right now, but you can follow our listing for future openings at ${business.name}.`;
  }

  if (lower.includes("service") || lower.includes("offer") || lower.includes("do you")) {
    return `Hi ${firstName}! ${business.name} specializes in ${services}. ${business.tagline || business.description.slice(0, 140)} Ask about booking, pricing, or partnerships anytime.`;
  }

  if (lower.includes("location") || lower.includes("where") || lower.includes("address")) {
    return `Hi ${firstName}! ${business.name} is based in ${location}. ${business.phone ? `Call us at ${business.phone} or` : "You can"} message here for directions and availability.`;
  }

  if (lower.includes("partner") || lower.includes("collab") || lower.includes("b2b")) {
    return `Hi ${firstName}! ${business.name} is open to local partnerships. Share what you have in mind — our team reviews B2B opportunities on BizList regularly.`;
  }

  return `Hi ${firstName}! Thanks for reaching out to ${business.name}. We serve ${location} with ${services}. ${business.tagline || "How can we help you today?"} Ask about services, hours, pricing, or jobs and I'll get you pointed in the right direction.`;
}

export function generateOutreachMessageFromLead(
  business: BusinessProfile,
  lead: Pick<LocalLead, "displayName" | "matchReasons" | "city" | "state" | "matchScore">,
): string {
  const first = lead.displayName.split(" ")[0] || "there";
  const reasons = lead.matchReasons.slice(0, 2).join("; ");
  const locationNote =
    lead.city && business.city && lead.city.toLowerCase() === business.city.toLowerCase()
      ? `I noticed you're also in ${lead.city}`
      : `We're active in ${business.city}, ${business.state}`;

  return `Hi ${first}, this is ${business.name}. ${locationNote} and saw a ${lead.matchScore}% match on BizList (${reasons.toLowerCase()}). We thought our ${business.category.toLowerCase()} work might fit — happy to answer questions or share what we're offering this week.`;
}

export function generateFreshAutomatedPost(business: BusinessProfile): {
  title: string;
  body: string;
  postType: "update" | "deal" | "job";
} {
  const location = `${business.city}, ${business.state}`;
  const topService = business.services[0];
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });

  if (business.isHiring) {
    return {
      postType: "job",
      title: `${business.name} is hiring — ${location}`,
      body: `We're growing our team this week. ${business.tagline || business.description.slice(0, 120)} Apply through our BizList listing or send us a message with your experience.`,
    };
  }

  if (topService) {
    return {
      postType: "deal",
      title: `${day} spotlight: ${topService.name}`,
      body: `${business.name} in ${location} is featuring ${topService.name}. ${topService.description?.slice(0, 160) || business.tagline || "Message us for details."}${topService.price ? ` ${topService.price}.` : ""}`,
    };
  }

  return {
    postType: "update",
    title: `This week at ${business.name}`,
    body: `${business.tagline || business.description.slice(0, 180)} Follow us on BizList for local updates, deals, and events in ${location}.`,
  };
}
