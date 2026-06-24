import { createClient } from "@/lib/supabase/server";
import type { AiAssessment, ForumCategory, LocalLead } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";
import { canAccess } from "@/lib/plans";
import { getCurrentProfile } from "./index";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "food & beverage": ["food", "restaurant", "bakery", "cafe", "catering"],
  "professional services": ["legal", "accounting", "consulting", "advice"],
  "retail & community": ["retail", "shop", "gifts", "makers", "local"],
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function scoreLeadMatch(
  customer: {
    bio: string;
    interest_tags: string[];
    forum_interests: ForumCategory[];
    city: string;
    state: string;
  },
  business: {
    category: string;
    city: string;
    state: string;
    description: string;
  },
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (normalize(customer.state) === normalize(business.state)) {
    score += 25;
    reasons.push(`Located in ${customer.state}`);
  }
  if (
    customer.city &&
    business.city &&
    normalize(customer.city) === normalize(business.city)
  ) {
    score += 25;
    reasons.push(`Same city: ${customer.city}`);
  }

  const categoryKey = normalize(business.category);
  const keywords =
    CATEGORY_KEYWORDS[categoryKey] ??
    categoryKey.split(/\s+/).filter((w) => w.length > 3);

  const haystack = normalize(
    `${customer.bio} ${customer.interest_tags.join(" ")} ${business.description}`,
  );

  for (const keyword of keywords) {
    if (haystack.includes(keyword)) {
      score += 15;
      reasons.push(`Interest aligned with ${business.category}`);
      break;
    }
  }

  for (const interest of customer.forum_interests) {
    if (interest === "local" || interest === "partnerships") {
      score += 10;
      reasons.push(`Active in ${FORUM_CATEGORY_LABELS[interest]}`);
      break;
    }
  }

  for (const tag of customer.interest_tags) {
    if (keywords.some((k) => normalize(tag).includes(k) || k.includes(normalize(tag)))) {
      score += 20;
      reasons.push(`Tagged interest: ${tag}`);
      break;
    }
  }

  return { score: Math.min(score, 100), reasons: [...new Set(reasons)] };
}

export async function getLocalLeads(userId: string): Promise<LocalLead[]> {
  const supabase = await createClient();
  if (!supabase) return getMockLeads();

  const profile = await getCurrentProfile();
  if (!profile || !canAccess(profile.planTier, "localLeads")) return [];
  if (profile.role === "customer") return [];

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const businessContext = business ?? {
    category: profile.bio.split(" ")[0] || "local services",
    city: profile.city,
    state: profile.state,
    description: profile.bio,
  };

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .neq("id", userId);

  if (profile.state) query = query.ilike("state", profile.state);
  if (profile.city) query = query.ilike("city", profile.city);

  const { data: customers } = await query.limit(50);
  if (!customers?.length) return [];

  return customers
    .map((customer) => {
      const match = scoreLeadMatch(
        {
          bio: customer.bio,
          interest_tags: customer.interest_tags ?? [],
          forum_interests: customer.forum_interests ?? [],
          city: customer.city,
          state: customer.state,
        },
        {
          category: businessContext.category,
          city: businessContext.city ?? profile.city,
          state: businessContext.state ?? profile.state,
          description: businessContext.description ?? profile.bio,
        },
      );

      return {
        id: customer.id,
        displayName: customer.display_name,
        city: customer.city,
        state: customer.state,
        bio: customer.bio,
        interestTags: customer.interest_tags ?? [],
        forumInterests: customer.forum_interests ?? [],
        matchScore: match.score,
        matchReasons: match.reasons,
      };
    })
    .filter((lead) => lead.matchScore >= 35)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export async function isEligibleLead(
  businessUserId: string,
  leadUserId: string,
): Promise<boolean> {
  if (businessUserId === leadUserId) return false;

  const leads = await getLocalLeads(businessUserId);
  return leads.some((lead) => lead.id === leadUserId);
}

export async function isProUser(userId: string): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.id === userId && canAccess(profile.planTier, "localLeads");
}

export async function getAiAssessments(userId: string): Promise<AiAssessment[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("ai_assessments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    businessId: row.business_id ?? undefined,
    websiteUrl: row.website_url,
    businessName: row.business_name,
    category: row.category,
    overallScore: row.overall_score,
    seoScore: row.seo_score,
    onlinePresenceScore: row.online_presence_score,
    businessClarityScore: row.business_clarity_score,
    summary: row.summary,
    recommendations: (row.recommendations as string[]) ?? [],
    createdAt: row.created_at,
  }));
}

function getMockLeads(): LocalLead[] {
  return [
    {
      id: "lead-1",
      displayName: "Alex Rivera",
      city: "Austin",
      state: "TX",
      bio: "Looking for local bakeries and catering for office events.",
      interestTags: ["bakery", "catering", "local food"],
      forumInterests: ["local"],
      matchScore: 85,
      matchReasons: ["Same city: Austin", "Interest aligned with Food & Beverage"],
    },
    {
      id: "lead-2",
      displayName: "Jordan Lee",
      city: "Austin",
      state: "TX",
      bio: "Small office manager seeking reliable local vendors.",
      interestTags: ["office catering", "local business"],
      forumInterests: ["partnerships", "local"],
      matchScore: 72,
      matchReasons: ["Located in TX", "Same city: Austin"],
    },
  ];
}
