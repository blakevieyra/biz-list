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
  bio: string;
  city: string;
  state: string;
  createdAt: string;
}

export interface BusinessProfile {
  id: string;
  ownerId: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  city: string;
  state: string;
  website?: string;
  intents: BusinessIntent[];
  followerIds: string[];
  followingIds: string[];
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
  connectionStatus: "none" | "pending" | "accepted" | "declined";
  followerCount: number;
  followingCount: number;
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
