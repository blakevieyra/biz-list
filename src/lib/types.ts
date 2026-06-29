export type BusinessService = {
  name: string;
  description: string;
  price?: string;
  imageUrl?: string;
  quantity?: string;
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
  pinterest?: string;
  threads?: string;
  snapchat?: string;
  yelp?: string;
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

export type PlanTier = "free" | "pro" | "platinum";

export type UserRole = "business" | "organization" | "customer" | "marketer";

export type BusinessIntent =
  | "hiring"
  | "seeking_customers"
  | "seeking_advice"
  | "open_to_partnerships"
  | "b2b"
  | "contract"
  | "proposal";

export type ForumCategory =
  | "general"
  | "lessons_learned"
  | "local"
  | "hiring"
  | "partnerships"
  | "marketing"
  | "tech_tools"
  | "business_tips"
  | "events";

export type FollowDigestFrequency = "none" | "daily" | "weekly" | "monthly";

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
  country: string;
  latitude?: number;
  longitude?: number;
  interestTags: string[];
  industryInterests: string[];
  headline: string;
  skills: string[];
  isSeekingWork: boolean;
  experienceText: string;
  resumeText: string;
  resumeUrl?: string;
  targetJobTitles: string[];
  jobAlertOptIn: boolean;
  followDigestFrequency: FollowDigestFrequency;
  forumInterests: ForumCategory[];
  discoveryRadius: DiscoveryRadius;
  createdAt: string;
  avatarUrl?: string;
}

export type JobApplicationQuestionKind = "short" | "legal" | "important";

export type JobApplicationQuestion = {
  id: string;
  kind: JobApplicationQuestionKind;
  label: string;
  required?: boolean;
  placeholder?: string;
};

export type JobApplicationFormConfig = {
  questions: JobApplicationQuestion[];
};

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
  country: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  socialLinks: BusinessSocialLinks;
  phone: string;
  hours: string;
  importantInfo: string;
  isHiring: boolean;
  jobTitle: string;
  jobDescription: string;
  jobRequirements: string;
  jobApplicationForm: JobApplicationFormConfig;
  services: BusinessService[];
  mediaUrls: string[];
  likeCount: number;
  ratingAvg: number;
  ratingCount: number;
  intents: BusinessIntent[];
  followerIds: string[];
  followingIds: string[];
  virtualAgentEnabled?: boolean;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  businessId: string;
  businessName?: string;
  applicantId: string;
  applicantName: string;
  message: string;
  coverLetter: string;
  resumeSnapshot: string;
  resumeFileUrl?: string;
  resumeAttached: boolean;
  formAnswers: Record<string, string>;
  status: "pending" | "reviewed" | "accepted" | "declined";
  createdAt: string;
  commentCount?: number;
}

export interface JobApplicationComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  isOwnerReply?: boolean;
}

export interface FollowedBusiness {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  city: string;
  state: string;
  isHiring: boolean;
  followedAt: string;
  mediaUrl?: string;
}

export interface ServiceOrder {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  serviceName: string;
  message: string;
  quantity: string;
  status: "pending" | "reviewed" | "in_progress" | "accepted" | "shipped" | "complete" | "declined";
  noteText?: string;
  createdAt: string;
}

export type BusinessPostType = "update" | "job" | "deal" | "video" | "help_needed" | "free" | "discussion";

export type FeedPostBadge = "following" | "trending" | "top-rated" | "popular";

export interface BusinessPostComment {
  id: string;
  authorName: string;
  authorId?: string;
  authorAvatarUrl?: string | null;
  memberSince?: string;
  body: string;
  createdAt: string;
  isOwnerReply?: boolean;
  parentId?: string | null;
  attachmentUrl?: string | null;
  likeCount?: number;
  likedByViewer?: boolean;
  replies?: BusinessPostComment[];
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
  businessFollowerCount?: number;
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
  likedByViewer?: boolean;
  recentComments?: BusinessPostComment[];
  createdAt: string;
}

export interface EventComment {
  id: string;
  eventId: string;
  authorId: string;
  authorName: string;
  body: string;
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
  authorAvatarUrl?: string;
  businessId?: string;
  category: ForumCategory;
  title: string;
  body: string;
  imageUrl?: string;
  commentIds: string[];
  likeCount?: number;
  likedByViewer?: boolean;
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

export type CollaborationType = "proposal" | "contract" | "b2b_sale";

export interface CollaborationIdea {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  businessId?: string;
  businessName?: string;
  businessCategory?: string;
  businessMediaUrl?: string;
  businessRatingAvg?: number;
  businessRatingCount?: number;
  title: string;
  summary: string;
  requirements?: string;
  deadline?: string;
  lookingFor: string;
  location: string;
  collaborationType: CollaborationType;
  status: "open" | "in_discussion" | "closed";
  interestedCount: number;
  userInterested?: boolean;
  attachmentUrls: string[];
  createdAt: string;
}

export interface CollaborationComment {
  id: string;
  collaborationId: string;
  authorId: string;
  authorName: string;
  body: string;
  attachmentUrls: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "follow" | "connection" | "comment" | "message" | "collaboration" | "event" | "deal_alert" | "job_match";
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
  otherUserAvatarUrl?: string;
  otherUserIsSeekingWork?: boolean;
  otherUserPlanTier?: string;
  businessIsHiring?: boolean;
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
  websiteScore?: number;
  profileScore?: number;
  contentInteractionScore?: number;
  industryMatchScore?: number;
  locationScore?: number;
  summary: string;
  recommendations: string[];
  topicBreakdown?: {
    id: string;
    label: string;
    score: number;
    summary: string;
    findings: string[];
    actions: string[];
  }[];
  createdAt: string;
}

export interface LocalLead {
  id: string;
  displayName: string;
  avatarUrl?: string;
  city: string;
  state: string;
  bio: string;
  interestTags: string[];
  industryInterests?: string[];
  forumInterests: ForumCategory[];
  matchScore: number;
  matchReasons: string[];
  leadSource?: "follower" | "interest" | "seeking" | "local";
  isFollower?: boolean;
  isSeekingWork?: boolean;
  isMock?: boolean;
}

export const FORUM_CATEGORY_LABELS: Record<ForumCategory, string> = {
  general: "General",
  lessons_learned: "Lessons Learned",
  local: "Local Community",
  hiring: "Hiring & Talent",
  partnerships: "Partnerships & Joint Ventures",
  marketing: "Marketing",
  tech_tools: "Tech & Tools",
  business_tips: "Business Tips",
  events: "Events & Meetups",
};

export const INTENT_LABELS: Record<BusinessIntent, string> = {
  hiring: "Hiring",
  seeking_customers: "Seeking Customers",
  seeking_advice: "Seeking Advice",
  open_to_partnerships: "Open to Partnerships",
  b2b: "B2B",
  contract: "Contract Work",
  proposal: "Open to Proposals",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  business: "Business",
  organization: "Organization",
  customer: "Customer / Community Member",
  marketer: "Marketer",
};

export type PaidPlanTier = "pro" | "platinum" | "customer_pro";

export type BillingInterval = "monthly" | "annual";

export type EventStatus = "draft" | "published" | "cancelled";

export type EventRsvpStatus = "going" | "interested";

export interface BusinessEvent {
  id: string;
  businessId: string;
  businessName?: string;
  businessMediaUrl?: string;
  authorId: string;
  title: string;
  description: string;
  location: string;
  address: string;
  city: string;
  state: string;
  county?: string;
  zipCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  category: string;
  imageUrl: string;
  startsAt: string;
  endsAt?: string;
  capacity?: number;
  status: EventStatus;
  goingCount: number;
  interestedCount: number;
  userRsvp?: EventRsvpStatus | null;
  createdAt: string;
}
