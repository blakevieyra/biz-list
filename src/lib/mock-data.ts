import type {
  BusinessProfile,
  CollaborationIdea,
  Comment,
  ForumPost,
  UserProfile,
} from "./types";

export const SEED_USERS: UserProfile[] = [
  {
    id: "user-1",
    displayName: "Maria Chen",
    email: "maria@riverbendbakery.com",
    role: "business",
    bio: "Owner of Riverbend Bakery — sourdough, pastries, and community events.",
    city: "Austin",
    state: "TX",
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "user-2",
    displayName: "James Okonkwo",
    email: "james@greenlinelegal.com",
    role: "business",
    bio: "Small-business attorney focused on contracts, leases, and compliance.",
    city: "Austin",
    state: "TX",
    createdAt: "2026-01-12T14:00:00Z",
  },
  {
    id: "user-3",
    displayName: "Local Makers Co-op",
    email: "hello@localmakers.org",
    role: "organization",
    bio: "Nonprofit supporting artisans and pop-up retail across Central Texas.",
    city: "Round Rock",
    state: "TX",
    createdAt: "2026-02-01T09:00:00Z",
  },
];

export const SEED_BUSINESSES: BusinessProfile[] = [
  {
    id: "biz-1",
    ownerId: "user-1",
    name: "Riverbend Bakery",
    tagline: "Fresh bread, stronger neighborhoods",
    description:
      "Neighborhood bakery offering wholesale loaves to cafés and catering for local events. Looking to partner with coffee shops and farmers markets.",
    category: "Food & Beverage",
    city: "Austin",
    state: "TX",
    website: "https://riverbendbakery.example",
    intents: ["seeking_customers", "open_to_partnerships", "hiring"],
    followerIds: ["user-2"],
    followingIds: ["biz-2"],
    createdAt: "2026-01-10T10:30:00Z",
  },
  {
    id: "biz-2",
    ownerId: "user-2",
    name: "Greenline Legal",
    tagline: "Practical legal guidance for growing businesses",
    description:
      "Flat-fee contract reviews, lease negotiations, and compliance checklists for startups and local shops.",
    category: "Professional Services",
    city: "Austin",
    state: "TX",
    intents: ["seeking_customers", "seeking_advice"],
    followerIds: ["user-1"],
    followingIds: ["biz-1", "biz-3"],
    createdAt: "2026-01-12T14:30:00Z",
  },
  {
    id: "biz-3",
    ownerId: "user-3",
    name: "Local Makers Co-op",
    tagline: "Shared retail for independent creators",
    description:
      "Rotating storefront space, shared marketing, and vendor events. Always looking for new makers and community sponsors.",
    category: "Retail & Community",
    city: "Round Rock",
    state: "TX",
    intents: ["seeking_customers", "open_to_partnerships", "hiring"],
    followerIds: [],
    followingIds: [],
    createdAt: "2026-02-01T09:30:00Z",
  },
];

export const SEED_POSTS: ForumPost[] = [
  {
    id: "post-1",
    authorId: "user-2",
    authorName: "James Okonkwo",
    category: "legal_lessons",
    title: "Lesson learned: always get vendor agreements in writing",
    body: "We helped a café owner recover deposits after a pop-up vendor dispute. Key takeaway: even informal partnerships need a one-page agreement covering dates, fees, and cancellation.",
    commentIds: ["comment-1", "comment-2"],
    createdAt: "2026-03-05T16:00:00Z",
  },
  {
    id: "post-2",
    authorId: "user-1",
    authorName: "Maria Chen",
    category: "local",
    title: "Best farmers markets for new food vendors in Austin?",
    body: "We're expanding wholesale and considering weekend markets. Which local markets have been welcoming to bakeries? Any booth fee ranges?",
    commentIds: ["comment-3"],
    createdAt: "2026-03-08T11:00:00Z",
  },
  {
    id: "post-3",
    authorId: "user-3",
    authorName: "Local Makers Co-op",
    category: "partnerships",
    title: "Joint holiday pop-up — seeking food + gift vendors",
    body: "Planning a December shared storefront in Round Rock. Looking for 3–4 complementary businesses for a co-branded holiday market.",
    commentIds: [],
    createdAt: "2026-03-10T09:00:00Z",
  },
];

export const SEED_COMMENTS: Comment[] = [
  {
    id: "comment-1",
    postId: "post-1",
    authorId: "user-1",
    authorName: "Maria Chen",
    body: "This would have saved us a headache last year. Do you have a template you'd recommend for pop-ups?",
    createdAt: "2026-03-05T17:00:00Z",
  },
  {
    id: "comment-2",
    postId: "post-1",
    authorId: "user-2",
    authorName: "James Okonkwo",
    body: "Happy to share our one-page pop-up checklist in the forum resources section soon.",
    createdAt: "2026-03-05T18:30:00Z",
  },
  {
    id: "comment-3",
    postId: "post-2",
    authorId: "user-3",
    authorName: "Local Makers Co-op",
    body: "Sunset Valley market has been great for us — friendly to first-time vendors.",
    createdAt: "2026-03-08T14:00:00Z",
  },
];

export const SEED_COLLABORATIONS: CollaborationIdea[] = [
  {
    id: "collab-1",
    authorId: "user-1",
    authorName: "Maria Chen",
    businessId: "biz-1",
    title: "Bakery + coffee shop co-branded breakfast box",
    summary:
      "Partner with a local roaster to sell weekend breakfast boxes: pastry, loaf, and beans.",
    lookingFor: "Coffee shop or roaster within 10 miles of Austin",
    location: "Austin, TX",
    status: "open",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "collab-2",
    authorId: "user-3",
    authorName: "Local Makers Co-op",
    businessId: "biz-3",
    title: "Shared loyalty program for indie retailers",
    summary:
      "Pilot a punch-card style rewards program across 5–8 small shops in Williamson County.",
    lookingFor: "Retail owners interested in cross-promotion",
    location: "Round Rock / Georgetown, TX",
    status: "in_discussion",
    createdAt: "2026-03-06T15:00:00Z",
  },
];

export function getBusinessById(id: string): BusinessProfile | undefined {
  return SEED_BUSINESSES.find((b) => b.id === id);
}

export function getPostById(id: string): ForumPost | undefined {
  return SEED_POSTS.find((p) => p.id === id);
}

export function getCommentsForPost(postId: string): Comment[] {
  return SEED_COMMENTS.filter((c) => c.postId === postId);
}

export function getUserById(id: string): UserProfile | undefined {
  return SEED_USERS.find((u) => u.id === id);
}
