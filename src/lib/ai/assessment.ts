export interface AssessmentInput {
  websiteUrl: string;
  businessName: string;
  category: string;
  description: string;
  city: string;
  state: string;
  tagline: string;
}

export interface AssessmentResult {
  overallScore: number;
  seoScore: number;
  onlinePresenceScore: number;
  businessClarityScore: number;
  summary: string;
  recommendations: string[];
}

function hasValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return Boolean(parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

function scoreSeo(input: AssessmentInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 40;

  if (hasValidUrl(input.websiteUrl)) {
    score += 25;
  } else {
    notes.push("Add a live website URL — local customers often search Google first.");
  }

  if (input.businessName.length >= 3) score += 10;
  if (input.category.trim()) {
    score += 10;
    notes.push(`Use "${input.category}" in page titles and meta descriptions.`);
  }
  if (input.city && input.state) {
    score += 15;
    notes.push(`Target local SEO keywords like "${input.category} in ${input.city}, ${input.state}".`);
  }

  return { score: Math.min(score, 100), notes };
}

function scorePresence(input: AssessmentInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 35;

  if (hasValidUrl(input.websiteUrl)) score += 20;
  if (input.description.length >= 80) {
    score += 20;
    notes.push("Your business description is a strong foundation for Google Business Profile and social bios.");
  } else {
    notes.push("Expand your online description to at least 80 characters across directory and social profiles.");
  }
  if (input.tagline.length >= 10) score += 15;
  notes.push("Claim Google Business Profile, Yelp, and at least one local directory listing.");
  notes.push("Post weekly on one social channel with photos, location tags, and a clear call-to-action.");

  return { score: Math.min(score, 100), notes };
}

function scoreClarity(input: AssessmentInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 30;

  if (input.tagline.length >= 10) score += 20;
  if (input.description.length >= 120) score += 25;
  if (input.businessName.length >= 2) score += 15;
  if (input.category.trim()) score += 10;

  if (input.tagline.length < 10) {
    notes.push("Write a one-line tagline that says who you serve and what makes you different.");
  }
  if (input.description.length < 120) {
    notes.push("Clarify services, service area, hours, and how customers should contact you.");
  }
  notes.push("Make your offer obvious above the fold on your website and BizList profile.");

  return { score: Math.min(score, 100), notes };
}

export function generateBusinessAssessment(input: AssessmentInput): AssessmentResult {
  const seo = scoreSeo(input);
  const presence = scorePresence(input);
  const clarity = scoreClarity(input);
  const overallScore = Math.round((seo.score + presence.score + clarity.score) / 3);

  const recommendations = [
    ...seo.notes,
    ...presence.notes,
    ...clarity.notes,
  ].slice(0, 8);

  const summary =
    overallScore >= 80
      ? `${input.businessName} has a solid local foundation. Focus on consistent listings, local keywords, and weekly content to capture nearby demand.`
      : overallScore >= 60
        ? `${input.businessName} is visible but missing key pieces for local discovery. Strengthen your website, listings, and messaging to convert nearby searches.`
        : `${input.businessName} needs core online presence work before paid ads will pay off. Start with website, Google Business Profile, and a clear local offer.`;

  return {
    overallScore,
    seoScore: seo.score,
    onlinePresenceScore: presence.score,
    businessClarityScore: clarity.score,
    summary,
    recommendations,
  };
}
