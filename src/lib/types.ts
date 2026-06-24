export type BusinessService = {
  name: string;
  description: string;
  price?: string;
  imageUrl?: string;
  serviceType?: string;
  /** External purchase link, or in-app order form when actionType is "form". */
  actionType?: "link" | "form";
  actionUrl?: string;
  actionLabel?: string;
};

export type BusinessSocialLinks = {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  x?: string;
  tiktok?: string;
  youtube?: string;
};

export type DiscoveryRadius =
  | "5"
  | "10"
  | "25"
  | "50"
  | "city"
  | "county"
  | "state"
  | "nation";
export type MileRadius = "5" | "10" | "25" | "50";
export type AreaScope = "city" | "county" | "state" | "nation";
export type FeedScope = DiscoveryRadius;

export type PlanTier = "free" | "basic" | "pro" | "platinum";

export type UserRole = "business" | "organization" | "customer";

export type BusinessIntent =
  | "hiring"
  | "seeking_customers"
  | "seeking_advice"
  | "open_to_partnerships";

export type ForumCategory =
  | "general"
  | "legal_lessons"
  | "local"
  | "hiring"
  | "partnerships";

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  planTier: PlanTier;
  bio: string;
  city: string;
  state: string;
  county?: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  interestTags: string[];
  industryInterests: string[];
  headline: string;
  skills: string[];
  isSeekingWork: boolean;
  forumInterests: ForumCategory[];
  discoveryRadius: DiscoveryRadius;
  /** @deprecated use discoveryRadius */
  feedScope: FeedScope;
  createdAt: string;
}

export interface BusinessProfile {
  id: string;
  ownerId: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  subcategory: string;
  city: string;
  state: string;
  county?: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  socialLinks: BusinessSocialLinks;
  phone: string;
  hours: string;
  importantInfo: string;
  isHiring: boolean;
  services: BusinessService[];
  mediaUrls: string[];
  likeCount: number;
  ratingAvg: number;
  ratingCount: number;
  intents: BusinessIntent[];
  followerIds: string[];
  followingIds: string[];
  createdAt: string;
}

export interface JobApplication {
  id: string;
  businessId: string;
  applicantId: string;
  applicantName: string;
  message: string;
  status: "pending" | "reviewed" | "accepted" | "declined";
  createdAt: string;
}

export interface ServiceOrder {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  serviceName: string;
  message: string;
  quantity: string;
  status: "pending" | "reviewed" | "accepted" | "declined";
  createdAt: string;
}

export type BusinessPostType = "update" | "job" | "deal" | "video" | "help_needed" | "free";

export type FeedPostBadge = "following" | "trending" | "top-rated" | "popular";

export interface BusinessPostComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isOwnerReply?: boolean;
}

export interface BusinessPost {
  id: string;
  businessId: string;
  businessName?: string;
  businessCategory?: string;
  businessMediaUrl?: string;
  businessRatingAvg?: number;
  businessRatingCount?: number;
  businessLikeCount?: number;
  authorId: string;
  authorName: string;
  postType: BusinessPostType;
  title: string;
  body: string;
  mediaUrls: string[];
  engagementScore: number;
  isTrending: boolean;
  isFollowed?: boolean;
  feedBadge?: FeedPostBadge;
  commentCount: number;
  likeCount: number;
  recentComments?: BusinessPostComment[];
  createdAt: string;
}

export interface BusinessReview {
  id: string;
  businessId: string;
  authorId: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
}

export interface WorkGroup {
  id: string;
  creatorId: string;
  creatorName: string;
  businessId?: string;
  title: string;
  focusArea: string;
  description: string;
  location: string;
  status: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  category: ForumCategory;
  title: string;
  body: string;
  commentIds: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CollaborationIdea {
  id: string;
  authorId: string;
  authorName: string;
  businessId?: string;
  title: string;
  summary: string;
  lookingFor: string;
  location: string;
  status: "open" | "in_discussion" | "closed";
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "follow" | "connection" | "comment" | "message" | "collaboration";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantA: string;
  participantB: string;
  businessId?: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface BusinessConnectionState {
  isFollowing: boolean;
  isLiked: boolean;
  connectionStatus: "none" | "pending" | "accepted" | "declined";
  followerCount: number;
  followingCount: number;
}

export interface AiAssessment {
  id: string;
  userId: string;
  businessId?: string;
  websiteUrl: string;
  businessName: string;
  category: string;
  overallScore: number;
  seoScore: number;
  onlinePresenceScore: number;
  businessClarityScore: number;
  summary: string;
  recommendations: string[];
  createdAt: string;
}

export interface LocalLead {
  id: string;
  displayName: string;
  city: string;
  state: string;
  bio: string;
  interestTags: string[];
  forumInterests: ForumCategory[];
  matchScore: number;
  matchReasons: string[];
}

export const FORUM_CATEGORY_LABELS: Record<ForumCategory, string> = {
  general: "General",
  legal_lessons: "Legal Lessons Learned",
  local: "Local Community",
  hiring: "Hiring & Talent",
  partnerships: "Partnerships & Joint Ventures",
};

export const INTENT_LABELS: Record<BusinessIntent, string> = {
  hiring: "Hiring",
  seeking_customers: "Seeking Customers",
  seeking_advice: "Seeking Advice",
  open_to_partnerships: "Open to Partnerships",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  business: "Business",
  organization: "Organization",
  customer: "Customer / Community Member",
};

export type PaidPlanTier = "pro" | "platinum";

export type BillingInterval = "monthly" | "annual";
