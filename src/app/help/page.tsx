import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "How do I create an account?",
    a: (
      <>
        Click <Link href="/auth/signup" className="text-accent hover:underline">Sign up</Link> and enter your email and a password. You&apos;ll receive a verification link — click it to activate your account, then complete your profile.
      </>
    ),
  },
  {
    q: "What types of accounts are available?",
    a: "You can sign up as a Business / Organization (to get a listing, post updates, and access the dashboard) or as a Community Member (to browse, follow businesses, and participate in forums).",
  },
  {
    q: "How do I claim or create a business listing?",
    a: (
      <>
        During profile setup choose <strong>Business</strong> as your role and fill in your business details. Your listing will be live in{" "}
        <Link href="/listings" className="text-accent hover:underline">Listings</Link> immediately after you save.
      </>
    ),
  },
  {
    q: "How does the Discovery Radius work?",
    a: "Your discovery radius controls how far AllConnect casts when showing you listings, feed posts, and events. You can set it to your city, county, state, or a specific mile radius. Adjust it any time from My Profile → Edit.",
  },
  {
    q: "How do I post an update, job, or deal?",
    a: (
      <>
        Business owners go to <Link href="/dashboard/posts" className="text-accent hover:underline">Dashboard → Posts</Link> and click <strong>New post</strong>. Choose the post type (Update, Job, Deal, Video, Help needed, or Free item) and publish.
      </>
    ),
  },
  {
    q: "How do I publish an event?",
    a: (
      <>
        From <Link href="/dashboard/events" className="text-accent hover:underline">Dashboard → Events</Link>, click <strong>New event</strong>, fill in the details, and publish. AllConnect Plus subscribers who follow your business will be notified.
      </>
    ),
  },
  {
    q: "What is AllConnect Plus?",
    a: (
      <>
        AllConnect Plus ($12.99/mo) is for community members who want job alerts, early access to deals, and event notifications from businesses they follow. Business Pro and Platinum plans include the same perks at no extra charge.{" "}
        <Link href="/pricing" className="text-accent hover:underline">See pricing →</Link>
      </>
    ),
  },
  {
    q: "What is Pro / Platinum for businesses?",
    a: (
      <>
        <strong>Pro</strong> ($49/mo) unlocks Local Leads, AI business audits, and Trending Boost for your posts. <strong>Platinum</strong> ($99/mo) adds Automated Marketing and a Virtual Agent AI chatbot for your listing.{" "}
        <Link href="/pricing" className="text-accent hover:underline">Compare plans →</Link>
      </>
    ),
  },
  {
    q: "How do I message a business or community member?",
    a: (
      <>
        Open any listing or profile and click <strong>Message</strong>. Your conversations appear in{" "}
        <Link href="/messages" className="text-accent hover:underline">Messages</Link>.
      </>
    ),
  },
  {
    q: "What are Collaborations?",
    a: (
      <>
        The <Link href="/partnerships" className="text-accent hover:underline">Partnerships</Link> board lets businesses post proposals, contracts, and B2B sales opportunities. Other members can express interest and comment to kick off a working relationship.
      </>
    ),
  },
  {
    q: "How do I apply for a job listed on AllConnect?",
    a: "Visit the business listing, scroll to the Jobs section, and click Apply. You'll answer any custom questions the business set up and can attach a resume.",
  },
  {
    q: "How do I cancel or change my subscription?",
    a: (
      <>
        Go to <Link href="/profile" className="text-accent hover:underline">My Profile</Link> → Plans, then click <strong>Manage billing</strong>. You&apos;ll be taken to the Stripe billing portal where you can change or cancel your plan.
      </>
    ),
  },
  {
    q: "I didn't receive a verification email. What should I do?",
    a: "Check your spam or junk folder. If it's not there, go back to the sign-up page and click Resend verification email. Make sure the email address you entered is correct.",
  },
  {
    q: "How do I report inappropriate content?",
    a: (
      <>
        Use the <Link href="/support" className="text-accent hover:underline">Support</Link> page to contact our team with a description and a link to the content. We review all reports.
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Help & FAQ"
        description="Quick answers for getting started on AllConnect."
      />

      <div className="space-y-3">
        {FAQ.map(({ q, a }) => (
          <Card key={q}>
            <h2 className="font-semibold text-sm">{q}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-border p-6 text-center">
        <p className="font-medium">Still have questions?</p>
        <p className="mt-1 text-sm text-muted">
          Our team is happy to help.{" "}
          <Link href="/support" className="text-accent hover:underline font-medium">
            Contact Support →
          </Link>
        </p>
      </div>
    </div>
  );
}
