/** Parent industries and specific subcategories for listings and discovery. */
export const INDUSTRY_CATALOG = {
  "Food & Beverage": [
    "Bakery & Pastry",
    "Restaurant",
    "Cafe & Coffee",
    "Bar & Brewery",
    "Catering",
    "Food Truck",
    "Grocery & Market",
  ],
  "Retail & Community": [
    "Clothing & Apparel",
    "Gifts & Home",
    "Bookstore",
    "Sporting Goods",
    "Maker & Craft",
    "Convenience & General",
  ],
  "Professional Services": [
    "Legal",
    "Accounting & Tax",
    "Consulting",
    "Real Estate",
    "Insurance",
    "Financial Planning",
  ],
  "Health & Wellness": [
    "Fitness & Gym",
    "Medical & Dental",
    "Spa & Salon",
    "Mental Health",
    "Nutrition & Coaching",
    "Pharmacy",
  ],
  "Marketing & Print": [
    "Print & Signage",
    "Graphic Design",
    "Photography",
    "Social Media",
    "Branding Agency",
  ],
  "Home & Construction": [
    "General Contractor",
    "Landscaping",
    "Plumbing",
    "Electrical",
    "HVAC",
    "Cleaning Services",
  ],
  "Auto & Transport": [
    "Auto Repair",
    "Car Wash & Detail",
    "Towing",
    "Moving & Delivery",
    "Rideshare & Shuttle",
  ],
  "Technology": [
    "IT Support",
    "Web & App Dev",
    "Computer Repair",
    "Cybersecurity",
    "SaaS & Software",
  ],
  "Entertainment & Events": [
    "Live Music & DJ",
    "Event Planning",
    "Venue & Hall",
    "Arts & Theater",
    "Party Rentals",
  ],
  "Education & Training": [
    "Tutoring",
    "Trade School",
    "Music Lessons",
    "Childcare & Preschool",
    "Test Prep",
  ],
  "Nonprofit & Community": [
    "Charity & Foundation",
    "Community Center",
    "Religious Organization",
    "Youth Programs",
    "Civic Group",
  ],
} as const;

export type IndustryOption = keyof typeof INDUSTRY_CATALOG;

export const INDUSTRY_OPTIONS = Object.keys(INDUSTRY_CATALOG) as IndustryOption[];

export const INDUSTRY_SEPARATOR = " › ";

export function formatIndustryTag(parent: string, subcategory: string): string {
  return `${parent}${INDUSTRY_SEPARATOR}${subcategory}`;
}

export function parseIndustryTag(value: string): { parent: string; subcategory: string | null } {
  const parts = value.split(INDUSTRY_SEPARATOR);
  if (parts.length >= 2) {
    return { parent: parts[0]!, subcategory: parts.slice(1).join(INDUSTRY_SEPARATOR) };
  }
  return { parent: value, subcategory: null };
}

export function getSubcategories(parent: string): readonly string[] {
  if (parent in INDUSTRY_CATALOG) {
    return INDUSTRY_CATALOG[parent as IndustryOption];
  }
  return [];
}

export function isIndustryOption(value: string): value is IndustryOption {
  return INDUSTRY_OPTIONS.includes(value as IndustryOption);
}

export function isValidSubcategory(parent: string, subcategory: string): boolean {
  return getSubcategories(parent).includes(subcategory);
}

export function allIndustryTags(): string[] {
  const tags: string[] = [];
  for (const parent of INDUSTRY_OPTIONS) {
    tags.push(parent);
    for (const sub of INDUSTRY_CATALOG[parent]) {
      tags.push(formatIndustryTag(parent, sub));
    }
  }
  return tags;
}

const TAG_SET = new Set(allIndustryTags());

export function isValidIndustryInterest(value: string): boolean {
  return TAG_SET.has(value);
}

export function displayCategoryLabel(category: string, subcategory?: string): string {
  if (subcategory) return formatIndustryTag(category, subcategory);
  return category;
}
