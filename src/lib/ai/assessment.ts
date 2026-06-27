export interface AssessmentInput {
  websiteUrl: string;
  businessName: string;
  category: string;
  subcategory?: string;
  description: string;
  city: string;
  state: string;
  county?: string;
  zipCode?: string;
  tagline: string;
  phone?: string;
  hours?: string;
  mediaCount?: number;
  servicesCount?: number;
  socialLinkCount?: number;
  reviewCount?: number;
  ratingAvg?: number;
  postCount?: number;
  followerCount?: number;
  hasHiringPost?: boolean;
  commentCount?: number;
  postLikeCount?: number;
  pageViewCount?: number;
  offeringClickCount?: number;
  hasCoordinates?: boolean;
}

export interface AssessmentTopic {
  id: string;
  label: string;
  score: number;
  summary: string;
  findings: string[];
  actions: string[];
}

export interface AssessmentResult {
  overallScore: number;
  seoScore: number;
  onlinePresenceScore: number;
  businessClarityScore: number;
  websiteScore: number;
  profileScore: number;
  contentInteractionScore: number;
  industryMatchScore: number;
  locationScore: number;
  summary: string;
  recommendations: string[];
  topicBreakdown: AssessmentTopic[];
}

function hasValidUrl(url: string): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return Boolean(parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

function buildTopic(
  id: string,
  label: string,
  score: number,
  summary: string,
  notes: string[],
): AssessmentTopic {
  return {
    id,
    label,
    score,
    summary,
    findings: notes.filter((n) => !n.startsWith("Action:")),
    actions: notes.filter((n) => n.startsWith("Action:")).map((n) => n.replace(/^Action:\s*/, "")),
  };
}

function scoreWebsite(input: AssessmentInput) {
  const notes: string[] = [];
  let score = 20;

  if (hasValidUrl(input.websiteUrl)) {
    score += 45;
    notes.push(`Live website detected at ${input.websiteUrl.replace(/^https?:\/\//, "")}.`);
  } else {
    notes.push("No valid website URL on your BizList profile.");
    notes.push("Action: Add a working homepage link so customers can verify you before visiting.");
  }

  if (input.phone?.trim()) score += 10;
  else notes.push("Action: Add a phone number to your website and listing.");

  if (input.hours?.trim()) score += 10;
  else notes.push("Action: Publish business hours on your site and BizList profile.");

  if (hasValidUrl(input.websiteUrl) && (input.servicesCount ?? 0) > 0) score += 15;

  const summary =
    score >= 75 ? "Website fundamentals look solid." : score >= 50 ? "Website exists but key trust signals are missing." : "Website presence needs immediate attention.";

  return { score: Math.min(score, 100), notes, summary };
}

function scoreSeo(input: AssessmentInput) {
  const notes: string[] = [];
  let score = 35;

  if (hasValidUrl(input.websiteUrl)) score += 20;
  if (input.businessName.length >= 3) score += 10;
  if (input.category.trim()) {
    score += 10;
    notes.push(`Category "${input.category}" should appear in page titles and meta descriptions.`);
  }
  if (input.city && input.state) {
    score += 15;
    notes.push(`Target local keywords like "${input.category} in ${input.city}, ${input.state}".`);
  }
  if (input.subcategory?.trim()) score += 10;

  const summary = score >= 75 ? "Local SEO signals are strong." : "SEO basics are partially in place — tighten local keywords.";

  return { score: Math.min(score, 100), notes, summary };
}

function scorePresence(input: AssessmentInput) {
  const notes: string[] = [];
  let score = 25;

  if (hasValidUrl(input.websiteUrl)) score += 15;
  if ((input.socialLinkCount ?? 0) >= 2) {
    score += 20;
    notes.push(`${input.socialLinkCount} social profiles linked — keep posting weekly with local hashtags.`);
  } else {
    notes.push("Action: Connect Instagram, Facebook, or LinkedIn on your BizList profile.");
  }
  if ((input.mediaCount ?? 0) >= 2) score += 15;
  else notes.push("Action: Add at least 3 photos to your listing.");
  if ((input.postCount ?? 0) >= 3) {
    score += 20;
    notes.push(`${input.postCount} BizList posts — you're building a content rhythm.`);
  } else {
    notes.push("Action: Publish at least one BizList post per week.");
  }
  if ((input.followerCount ?? 0) >= 5) score += 10;

  const summary = score >= 75 ? "Strong multi-channel presence." : "Presence is thin — add photos, social links, and regular posts.";

  return { score: Math.min(score, 100), notes, summary };
}

function scoreClarity(input: AssessmentInput) {
  const notes: string[] = [];
  let score = 25;

  if (input.tagline.length >= 10) score += 20;
  else notes.push("Action: Write a one-line tagline that says who you serve.");

  if (input.description.length >= 120) score += 25;
  else notes.push("Action: Expand your About section to explain services and how to buy.");

  if ((input.servicesCount ?? 0) >= 2) score += 20;
  else notes.push("Action: List at least two services or products with prices.");

  if (input.businessName.length >= 2) score += 10;
  if (input.category.trim()) score += 10;

  const summary = score >= 75 ? "Customers can quickly understand what you do." : "Messaging is unclear — sharpen tagline and services.";

  return { score: Math.min(score, 100), notes, summary };
}

function scoreProfile(input: AssessmentInput) {
  const notes: string[] = [];
  let score = 30;

  if (input.description.length >= 80) score += 20;
  if ((input.servicesCount ?? 0) > 0) score += 15;
  if ((input.mediaCount ?? 0) > 0) score += 15;
  if ((input.reviewCount ?? 0) > 0) {
    score += 15;
    notes.push(`${input.reviewCount} review(s) at ${(input.ratingAvg ?? 0).toFixed(1)}★ average.`);
  } else {
    notes.push("Action: Ask happy customers for BizList reviews.");
  }
  if ((input.ratingAvg ?? 0) >= 4) score += 10;
  if (input.hasHiringPost || input.phone) score += 5;

  const summary = score >= 75 ? "BizList profile is complete and credible." : "Profile gaps are hurting trust.";

  return { score: Math.min(score, 100), notes, summary };
}

function scoreContentInteraction(input: AssessmentInput) {
  const notes: string[] = [];
  let score = 20;
  const posts = input.postCount ?? 0;
  const comments = input.commentCount ?? 0;
  const likes = input.postLikeCount ?? 0;
  const views = input.pageViewCount ?? 0;

  if (posts >= 1) {
    score += 15;
    notes.push(`${posts} feed post(s) on BizList.`);
  } else {
    notes.push("Action: Publish your first BizList update, job, or deal.");
  }

  if (comments >= 3) {
    score += 20;
    notes.push(`${comments} comment(s) on your posts — active conversations.`);
  } else if (comments > 0) {
    score += 10;
  } else {
    notes.push("Action: Ask questions in posts to encourage comments.");
  }

  if (likes >= 5) score += 15;
  else if (likes > 0) score += 8;

  if (views >= 20) {
    score += 15;
    notes.push(`${views} listing page view(s).`);
  } else if (views > 0) {
    score += 8;
  }

  if ((input.followerCount ?? 0) >= 5) score += 10;

  const summary =
    score >= 75 ? "Healthy content interaction." : score >= 50 ? "Some engagement — post and reply more." : "Low interaction on your content.";

  return { score: Math.min(score, 100), notes, summary };
}

function scoreIndustryMatch(input: AssessmentInput) {
  const notes: string[] = [];
  let score = 40;

  if (input.category.trim()) {
    score += 20;
    notes.push(`Primary industry: ${input.category}.`);
  }
  if (input.subcategory?.trim()) {
    score += 20;
    notes.push(`Sub-industry "${input.subcategory}" improves lead and partner matching.`);
  } else {
    notes.push("Action: Set a sub-industry for better matching.");
  }
  if ((input.servicesCount ?? 0) >= 2) score += 15;
  if (input.hasHiringPost) score += 10;

  const summary = score >= 75 ? "Industry signals are clear." : "Industry categorization needs work.";

  return { score: Math.min(score, 100), notes, summary };
}

function scoreLocation(input: AssessmentInput) {
  const notes: string[] = [];
  let score = 30;

  if (input.city?.trim() && input.state?.trim()) {
    score += 25;
    notes.push(`Listed in ${input.city}, ${input.state}${input.zipCode ? ` ${input.zipCode}` : ""}.`);
  } else {
    notes.push("Action: Complete city and state on your profile.");
  }

  if (input.county?.trim()) score += 10;
  if (input.hasCoordinates) {
    score += 20;
    notes.push("Map coordinates saved — enables mile-radius discovery.");
  } else if (input.zipCode?.trim()) {
    score += 10;
  } else {
    notes.push("Action: Add zip code or map pin for local matching.");
  }

  const summary = score >= 75 ? "Location data supports local discovery." : "Location profile is incomplete.";

  return { score: Math.min(score, 100), notes, summary };
}

export function generateBusinessAssessment(input: AssessmentInput): AssessmentResult {
  const website = scoreWebsite(input);
  const seo = scoreSeo(input);
  const presence = scorePresence(input);
  const clarity = scoreClarity(input);
  const profile = scoreProfile(input);
  const contentInteraction = scoreContentInteraction(input);
  const industryMatch = scoreIndustryMatch(input);
  const location = scoreLocation(input);

  const topicBreakdown: AssessmentTopic[] = [
    buildTopic("website", "Website", website.score, website.summary, website.notes),
    buildTopic("seo", "SEO", seo.score, seo.summary, seo.notes),
    buildTopic("presence", "Online presence", presence.score, presence.summary, presence.notes),
    buildTopic("clarity", "Business clarity", clarity.score, clarity.summary, clarity.notes),
    buildTopic("profile", "BizList profile", profile.score, profile.summary, profile.notes),
    buildTopic("content", "Content interaction", contentInteraction.score, contentInteraction.summary, contentInteraction.notes),
    buildTopic("industry", "Industry match", industryMatch.score, industryMatch.summary, industryMatch.notes),
    buildTopic("location", "Location & reach", location.score, location.summary, location.notes),
  ];

  const overallScore = Math.round(
    topicBreakdown.reduce((sum, topic) => sum + topic.score, 0) / topicBreakdown.length,
  );

  const recommendations = topicBreakdown
    .flatMap((topic) => [...topic.findings, ...topic.actions.map((a) => `Action: ${a}`)])
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 12);

  const summary =
    overallScore >= 80
      ? `${input.businessName} has a strong local presence. Double down on reviews, weekly posts, and lead follow-up.`
      : overallScore >= 60
        ? `${input.businessName} is discoverable but has gaps in website, profile, content, or local signals.`
        : `${input.businessName} needs core presence work — website, photos, services, content rhythm, and location data.`;

  return {
    overallScore,
    seoScore: seo.score,
    onlinePresenceScore: presence.score,
    businessClarityScore: clarity.score,
    websiteScore: website.score,
    profileScore: profile.score,
    contentInteractionScore: contentInteraction.score,
    industryMatchScore: industryMatch.score,
    locationScore: location.score,
    summary,
    recommendations,
    topicBreakdown,
  };
}

export function assessmentInputFromBusiness(
  business: {
    name: string;
    tagline: string;
    description: string;
    category: string;
    subcategory?: string;
    city: string;
    state: string;
    county?: string;
    zipCode?: string;
    website?: string;
    phone?: string;
    hours?: string;
    mediaUrls?: string[];
    services?: unknown[];
    socialLinks?: Record<string, string | undefined>;
    ratingCount?: number;
    ratingAvg?: number;
    followerIds?: string[];
    isHiring?: boolean;
    latitude?: number;
    longitude?: number;
  },
  extras?: {
    postCount?: number;
    hasHiringPost?: boolean;
    commentCount?: number;
    postLikeCount?: number;
    pageViewCount?: number;
    offeringClickCount?: number;
    followerCount?: number;
  },
): AssessmentInput {
  const socialLinkCount = Object.values(business.socialLinks ?? {}).filter(Boolean).length;
  return {
    websiteUrl: business.website ?? "",
    businessName: business.name,
    category: business.category,
    subcategory: business.subcategory,
    description: business.description,
    city: business.city,
    state: business.state,
    county: business.county,
    zipCode: business.zipCode,
    tagline: business.tagline,
    phone: business.phone,
    hours: business.hours,
    mediaCount: business.mediaUrls?.length ?? 0,
    servicesCount: Array.isArray(business.services) ? business.services.length : 0,
    socialLinkCount,
    reviewCount: business.ratingCount ?? 0,
    ratingAvg: business.ratingAvg ?? 0,
    postCount: extras?.postCount ?? 0,
    followerCount: extras?.followerCount ?? business.followerIds?.length ?? 0,
    hasHiringPost: extras?.hasHiringPost ?? business.isHiring,
    commentCount: extras?.commentCount ?? 0,
    postLikeCount: extras?.postLikeCount ?? 0,
    pageViewCount: extras?.pageViewCount ?? 0,
    offeringClickCount: extras?.offeringClickCount ?? 0,
    hasCoordinates: Boolean(business.latitude && business.longitude),
  };
}
