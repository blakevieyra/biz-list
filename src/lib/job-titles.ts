/** Common local job titles grouped for job seeker profiles. */
export const JOB_TITLE_CATALOG = {
  "Food & Hospitality": [
    "Barista",
    "Server",
    "Line Cook",
    "Pastry Assistant",
    "Shift Manager",
    "Catering Staff",
  ],
  "Retail & Sales": [
    "Sales Associate",
    "Store Manager",
    "Cashier",
    "Visual Merchandiser",
    "Customer Service Rep",
  ],
  "Office & Admin": [
    "Administrative Assistant",
    "Receptionist",
    "Office Manager",
    "Bookkeeper",
    "Data Entry Clerk",
  ],
  "Marketing & Creative": [
    "Social Media Coordinator",
    "Graphic Designer",
    "Content Writer",
    "Photographer",
    "Marketing Assistant",
  ],
  "Trades & Operations": [
    "General Laborer",
    "Warehouse Associate",
    "Delivery Driver",
    "Maintenance Technician",
    "Landscaper",
  ],
  "Health & Wellness": [
    "Front Desk Coordinator",
    "Fitness Instructor",
    "Medical Assistant",
    "Spa Attendant",
  ],
  "Professional": [
    "Paralegal",
    "Legal Assistant",
    "Accountant",
    "Consultant",
    "Project Coordinator",
  ],
} as const;

export type JobTitleCategory = keyof typeof JOB_TITLE_CATALOG;

export const JOB_TITLE_CATEGORIES = Object.keys(JOB_TITLE_CATALOG) as JobTitleCategory[];

export function allJobTitles(): string[] {
  const titles: string[] = [];
  for (const category of JOB_TITLE_CATEGORIES) {
    for (const title of JOB_TITLE_CATALOG[category]) {
      titles.push(title);
    }
  }
  return titles;
}

const TITLE_SET = new Set(allJobTitles());

export function isValidJobTitle(value: string): boolean {
  return TITLE_SET.has(value);
}
