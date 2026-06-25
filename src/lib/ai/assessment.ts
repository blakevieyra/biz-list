export interface AssessmentInput {
  websiteUrl: string;
  businessName: string;
  category: string;
  subcategory?: string;
  description: string;
  city: string;
  state: string;
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
}

export interface AssessmentResult {
  overallScore: number;
  seoScore: number;
  onlinePresenceScore: number;
  businessClarityScore: number;
  websiteScore: number;
  profileScore: number;
  summary: string;
  recommendations: string[];
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

function scoreWebsite(input: AssessmentInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 20;

  if (hasValidUrl(input.websiteUrl)) {
    score += 45;
    notes.push("Website URL is set — keep contact info and offers updated on your homepage.");
  } else {
    notes.push("Add a live website URL. Local customers often check Google and your site before visiting.");
  }

  if (input.phone?.trim()) score += 10;
  else notes.push("Publish a phone number on your website and BizList profile.");

  if (input.hours?.trim()) score += 10;
  else notes.push("List business hours on your website and listing.");

  if (hasValidUrl(input.websiteUrl) && input.servicesCount && input.servicesCount > 0) {
    score += 15;
    notes.push("Highlight top services above the fold on your website.");
  }

  return { score: Math.min(score, 100), notes };
}

function scoreSeo(input: AssessmentInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 35;

  if (hasValidUrl(input.websiteUrl)) score += 20;
  if (input.businessName.length >= 3) score += 10;
  if (input.category.trim()) {
    score += 10;
    notes.push(`Use "${input.category}" in page titles and meta descriptions.`);
  }
  if (input.city && input.state) {
    score += 15;
    notes.push(`Target local SEO keywords like "${input.category} in ${input.city}, ${input.state}".`);
  }
  if (input.subcategory?.trim()) score += 10;

  return { score: Math.min(score, 100), notes };
}

function scorePresence(input: AssessmentInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 25;

  if (hasValidUrl(input.websiteUrl)) score += 15;
  if ((input.socialLinkCount ?? 0) >= 2) {
    score += 20;
    notes.push("Social profiles are linked — post weekly with photos and local hashtags.");
  } else {
    notes.push("Connect Instagram, Facebook, or LinkedIn on your BizList profile.");
  }
  if ((input.mediaCount ?? 0) >= 2) score += 15;
  else notes.push("Add more photos to your listing — visuals drive local discovery.");
  if ((input.postCount ?? 0) >= 3) {
    score += 20;
    notes.push("You're posting regularly on BizList — keep a weekly rhythm.");
  } else {
    notes.push("Publish at least one BizList post per week with offers, jobs, or updates.");
  }
  if ((input.followerCount ?? 0) >= 5) score += 10;

  notes.push("Claim Google Business Profile and keep NAP (name, address, phone) consistent everywhere.");

  return { score: Math.min(score, 100), notes };
}

function scoreClarity(input: AssessmentInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 25;

  if (input.tagline.length >= 10) score += 20;
  else notes.push("Write a one-line tagline that says who you serve and what makes you different.");

  if (input.description.length >= 120) score += 25;
  else notes.push("Expand your About section to explain services, area served, and how to buy.");

  if ((input.servicesCount ?? 0) >= 2) score += 20;
  else notes.push("List at least two services or products with prices on your profile.");

  if (input.businessName.length >= 2) score += 10;
  if (input.category.trim()) score += 10;

  return { score: Math.min(score, 100), notes };
}

function scoreProfile(input: AssessmentInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 30;

  if (input.description.length >= 80) score += 20;
  if ((input.servicesCount ?? 0) > 0) score += 15;
  if ((input.mediaCount ?? 0) > 0) score += 15;
  if ((input.reviewCount ?? 0) > 0) {
    score += 15;
    notes.push(`You have ${input.reviewCount} review(s) — respond to build trust.`);
  } else {
    notes.push("Ask happy customers for reviews on BizList.");
  }
  if ((input.ratingAvg ?? 0) >= 4) score += 10;
  if (input.hasHiringPost || input.phone) score += 5;

  return { score: Math.min(score, 100), notes };
}

export function generateBusinessAssessment(input: AssessmentInput): AssessmentResult {
  const website = scoreWebsite(input);
  const seo = scoreSeo(input);
  const presence = scorePresence(input);
  const clarity = scoreClarity(input);
  const profile = scoreProfile(input);

  const overallScore = Math.round(
    (website.score + seo.score + presence.score + clarity.score + profile.score) / 5,
  );

  const recommendations = [
    ...website.notes,
    ...seo.notes,
    ...presence.notes,
    ...clarity.notes,
    ...profile.notes,
  ].slice(0, 10);

  const summary =
    overallScore >= 80
      ? `${input.businessName} has a strong local presence. Double down on reviews, weekly posts, and lead follow-up.`
      : overallScore >= 60
        ? `${input.businessName} is discoverable but has gaps in website, profile, or content rhythm.`
        : `${input.businessName} needs core presence work — website, photos, services, and consistent posting.`;

  return {
    overallScore,
    seoScore: seo.score,
    onlinePresenceScore: presence.score,
    businessClarityScore: clarity.score,
    websiteScore: website.score,
    profileScore: profile.score,
    summary,
    recommendations,
  };
}

export function assessmentInputFromBusiness(business: {
  name: string;
  tagline: string;
  description: string;
  category: string;
  subcategory?: string;
  city: string;
  state: string;
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
}, extras?: { postCount?: number; hasHiringPost?: boolean }): AssessmentInput {
  const socialLinkCount = Object.values(business.socialLinks ?? {}).filter(Boolean).length;
  return {
    websiteUrl: business.website ?? "",
    businessName: business.name,
    category: business.category,
    subcategory: business.subcategory,
    description: business.description,
    city: business.city,
    state: business.state,
    tagline: business.tagline,
    phone: business.phone,
    hours: business.hours,
    mediaCount: business.mediaUrls?.length ?? 0,
    servicesCount: Array.isArray(business.services) ? business.services.length : 0,
    socialLinkCount,
    reviewCount: business.ratingCount ?? 0,
    ratingAvg: business.ratingAvg ?? 0,
    postCount: extras?.postCount ?? 0,
    followerCount: business.followerIds?.length ?? 0,
    hasHiringPost: extras?.hasHiringPost ?? business.isHiring,
  };
}
