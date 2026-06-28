import { createClient } from "@/lib/supabase/server";
import type { AiAssessment, ForumCategory, LocalLead } from "@/lib/types";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";
import { canAccess } from "@/lib/plans";
import { getCurrentProfile } from "./index";
import { parseIndustryTag } from "@/lib/industries";

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
    headline?: string;
    interest_tags: string[];
    industry_interests: string[];
    forum_interests: ForumCategory[];
    city: string;
    state: string;
    is_seeking_work?: boolean;
    target_job_titles?: string[];
  },
  business: {
    category: string;
    subcategory?: string;
    city: string;
    state: string;
    description: string;
    is_hiring?: boolean;
  },
  isFollower: boolean,
  interaction?: {
    viewedListing?: boolean;
    commentedOnPosts?: number;
    likedContent?: number;
  },
): { score: number; reasons: string[]; leadSource: LocalLead["leadSource"] } {
  const reasons: string[] = [];
  let score = 0;
  let leadSource: LocalLead["leadSource"] = "local";

  if (isFollower) {
    score += 40;
    reasons.push("Follows your business on BizList");
    leadSource = "follower";
  }

  if (normalize(customer.state) === normalize(business.state)) {
    score += 15;
    if (!isFollower) reasons.push(`Located in ${customer.state}`);
  }
  if (
    customer.city &&
    business.city &&
    normalize(customer.city) === normalize(business.city)
  ) {
    score += 15;
    if (!isFollower) reasons.push(`Same city: ${customer.city}`);
  }

  const businessTags = [
    business.category,
    business.subcategory ?? "",
    ...`${business.category} ${business.subcategory ?? ""}`.split(/\s+/),
  ].map(normalize);

  for (const interest of customer.industry_interests ?? []) {
    const parsed = parseIndustryTag(interest);
    const parent = normalize(parsed.parent);
    const sub = normalize(parsed.subcategory ?? "");
    if (
      businessTags.some((tag) => tag && (parent.includes(tag) || tag.includes(parent) || (sub && sub.includes(tag))))
    ) {
      score += 30;
      reasons.push(`Industry interest: ${interest}`);
      if (leadSource === "local") leadSource = "interest";
      break;
    }
  }

  const categoryKey = normalize(business.category);
  const keywords =
    CATEGORY_KEYWORDS[categoryKey] ??
    categoryKey.split(/\s+/).filter((w) => w.length > 3);

  const haystack = normalize(
    `${customer.bio} ${customer.headline ?? ""} ${customer.interest_tags.join(" ")} ${(customer.target_job_titles ?? []).join(" ")} ${business.description}`,
  );

  for (const keyword of keywords) {
    if (haystack.includes(keyword)) {
      score += 15;
      if (leadSource === "local") {
        reasons.push(`Interest aligned with ${business.category}`);
        leadSource = "interest";
      }
      break;
    }
  }

  for (const tag of customer.interest_tags) {
    if (keywords.some((k) => normalize(tag).includes(k) || k.includes(normalize(tag)))) {
      score += 15;
      reasons.push(`Tagged interest: ${tag}`);
      break;
    }
  }

  for (const interest of customer.forum_interests) {
    if (interest === "local" || interest === "partnerships" || interest === "hiring") {
      score += 10;
      reasons.push(`Active in ${FORUM_CATEGORY_LABELS[interest]}`);
      break;
    }
  }

  if (customer.is_seeking_work && business.is_hiring) {
    score += 25;
    reasons.push("Seeking work while you're hiring");
    leadSource = "seeking";
  }

  if (interaction?.viewedListing) {
    score += 20;
    reasons.push("Viewed your BizList listing");
    if (leadSource === "local") leadSource = "interest";
  }

  if ((interaction?.commentedOnPosts ?? 0) > 0) {
    score += 15;
    reasons.push(`Commented on ${interaction?.commentedOnPosts} of your posts`);
    if (leadSource === "local") leadSource = "interest";
  }

  if ((interaction?.likedContent ?? 0) > 0) {
    score += 10;
    reasons.push("Liked your listing or posts");
    if (leadSource === "local") leadSource = "interest";
  }

  return { score: Math.min(score, 100), reasons: [...new Set(reasons)], leadSource };
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

  if (!business) return [];

  const { data: follows } = await supabase
    .from("business_follows")
    .select("follower_id")
    .eq("business_id", business.id);

  const followerIds = new Set((follows ?? []).map((f) => f.follower_id));

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .neq("id", userId);

  if (profile.state) query = query.ilike("state", profile.state);

  const { data: customers } = await query.limit(80);
  if (!customers?.length) return getMockLeads();

  const customerIds = customers.map((c) => c.id);

  const [{ data: views }, { data: postRows }, { data: likes }] = await Promise.all([
    supabase
      .from("business_page_views")
      .select("viewer_id")
      .eq("business_id", business.id)
      .in("viewer_id", customerIds),
    supabase.from("business_posts").select("id").eq("business_id", business.id),
    supabase
      .from("business_content_likes")
      .select("user_id")
      .eq("business_id", business.id)
      .in("user_id", customerIds),
  ]);

  const viewers = new Set((views ?? []).map((v) => v.viewer_id).filter(Boolean));
  const postIds = (postRows ?? []).map((p) => p.id);
  let commentCounts = new Map<string, number>();

  if (postIds.length) {
    const { data: comments } = await supabase
      .from("business_post_comments")
      .select("author_id")
      .in("post_id", postIds)
      .in("author_id", customerIds);
    for (const comment of comments ?? []) {
      commentCounts.set(comment.author_id, (commentCounts.get(comment.author_id) ?? 0) + 1);
    }
  }

  const likeCounts = new Map<string, number>();
  for (const like of likes ?? []) {
    likeCounts.set(like.user_id, (likeCounts.get(like.user_id) ?? 0) + 1);
  }

  const leads = customers
    .map((customer) => {
      const isFollower = followerIds.has(customer.id);
      const match = scoreLeadMatch(
        {
          bio: customer.bio,
          headline: customer.headline,
          interest_tags: customer.interest_tags ?? [],
          industry_interests: customer.industry_interests ?? [],
          forum_interests: customer.forum_interests ?? [],
          city: customer.city,
          state: customer.state,
          is_seeking_work: customer.is_seeking_work,
          target_job_titles: customer.target_job_titles ?? [],
        },
        {
          category: business.category,
          subcategory: business.subcategory,
          city: business.city ?? profile.city,
          state: business.state ?? profile.state,
          description: business.description ?? profile.bio,
          is_hiring: business.is_hiring,
        },
        isFollower,
        {
          viewedListing: viewers.has(customer.id),
          commentedOnPosts: commentCounts.get(customer.id) ?? 0,
          likedContent: likeCounts.get(customer.id) ?? 0,
        },
      );

      return {
        id: customer.id,
        displayName: customer.display_name,
        avatarUrl: customer.avatar_url ?? undefined,
        city: customer.city,
        state: customer.state,
        bio: customer.bio,
        interestTags: customer.interest_tags ?? [],
        industryInterests: customer.industry_interests ?? [],
        forumInterests: customer.forum_interests ?? [],
        matchScore: match.score,
        matchReasons: match.reasons,
        leadSource: match.leadSource,
        isFollower,
        isSeekingWork: customer.is_seeking_work ?? false,
      };
    })
    .filter((lead) => lead.isFollower || lead.matchScore >= 30)
    .sort((a, b) => {
      if (Boolean(a.isFollower) !== Boolean(b.isFollower)) return a.isFollower ? -1 : 1;
      return b.matchScore - a.matchScore;
    });

  return leads.length ? leads : getMockLeads();
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

  return (data ?? []).map((row) => {
    const topics = (row.topic_breakdown as AiAssessment["topicBreakdown"]) ?? [];
    const topicScore = (id: string) => topics.find((t) => t.id === id)?.score;

    return {
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
      websiteScore: topicScore("website") ?? row.seo_score,
      profileScore: topicScore("profile") ?? row.business_clarity_score,
      contentInteractionScore: topicScore("content"),
      industryMatchScore: topicScore("industry"),
      locationScore: topicScore("location"),
      summary: row.summary,
      recommendations: (row.recommendations as string[]) ?? [],
      topicBreakdown: topics,
      createdAt: row.created_at,
    };
  });
}

export async function getLatestAiAssessment(userId: string): Promise<AiAssessment | null> {
  const supabase = await createClient();

  const [legacyList, compResult] = await Promise.all([
    getAiAssessments(userId),
    supabase
      ? supabase
          .from("business_audits")
          .select("id, business_name, result, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const legacy = legacyList[0] ?? null;
  const compRow = compResult.data;

  if (!compRow) return legacy;

  const comp = compRow.result as { overallScore?: number; executiveSummary?: string } | null;
  const compDate = compRow.created_at as string;

  if (!legacy || new Date(compDate) >= new Date(legacy.createdAt)) {
    return {
      id: compRow.id as string,
      userId,
      businessName: compRow.business_name as string,
      overallScore: comp?.overallScore ?? 0,
      seoScore: 0,
      onlinePresenceScore: 0,
      businessClarityScore: 0,
      summary: comp?.executiveSummary ?? "",
      recommendations: [],
      topicBreakdown: [],
      createdAt: compDate,
    } as unknown as AiAssessment;
  }

  return legacy;
}

function getMockLeads(): LocalLead[] {
  return [
    {
      id: "mock-1",
      displayName: "Alex Rivera",
      city: "Austin",
      state: "TX",
      bio: "Looking for local bakeries and catering for office events.",
      interestTags: ["marketing", "events"],
      industryInterests: ["Marketing & Print › Photography", "Food & Beverage › Restaurant"],
      forumInterests: ["local"],
      matchScore: 85,
      matchReasons: ["Follows your business on BizList", "Industry interest: Food & Beverage › Restaurant"],
      leadSource: "follower",
      isFollower: true,
      isMock: true,
    },
    {
      id: "mock-2",
      displayName: "Sam Nguyen",
      city: "Austin",
      state: "TX",
      bio: "Product photographer for local shops and restaurants.",
      interestTags: ["photography", "branding"],
      industryInterests: ["Marketing & Print › Photography"],
      forumInterests: ["partnerships", "local"],
      matchScore: 72,
      matchReasons: ["Industry interest: Marketing & Print › Photography", "Same city: Austin"],
      leadSource: "interest",
      isFollower: false,
      isMock: true,
    },
  ];
}
