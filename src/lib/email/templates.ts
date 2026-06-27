import { EMAIL_LOGO_CID } from "./logo";
import { getAppUrl } from "./config";

export type EmailTemplateInput = {
  title: string;
  greeting?: string;
  body: string;
  htmlExtras?: string;
  code?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

function scoreColor(value: number): string {
  if (value >= 75) return "#059669";
  if (value >= 50) return "#d97706";
  return "#dc2626";
}

function scoreBg(value: number): string {
  if (value >= 75) return "#ecfdf5";
  if (value >= 50) return "#fffbeb";
  return "#fef2f2";
}

export function buildAssessmentScoreGrid(
  topics: { label: string; score: number }[],
): string {
  const rows: string[] = [];

  for (let i = 0; i < topics.length; i += 4) {
    const chunk = topics.slice(i, i + 4);
    const cells = chunk
      .map(
        (topic) => `<td style="padding:6px;width:25%;">
        <div style="background:${scoreBg(topic.score)};border-radius:10px;padding:10px 8px;text-align:center;border:1px solid #e2e8f0;">
          <p style="margin:0;font-size:20px;font-weight:800;color:${scoreColor(topic.score)};">${topic.score}</p>
          <p style="margin:4px 0 0;font-size:11px;font-weight:600;color:#475569;line-height:1.3;">${topic.label}</p>
        </div>
      </td>`,
      )
      .join("");
    rows.push(`<tr>${cells}</tr>`);
  }

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 8px;">
    ${rows.join("")}
  </table>`;
}

export function buildRecommendationList(items: string[]): string {
  if (!items.length) return "";
  const list = items
    .slice(0, 6)
    .map(
      (item) =>
        `<li style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#475569;">${item.replace(/^Action:\s*/i, "")}</li>`,
    )
    .join("");

  return `<div style="margin:24px 0 0;padding:18px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#007BFF;">Top recommendations</p>
    <ul style="margin:0;padding-left:18px;">${list}</ul>
  </div>`;
}

export function buildBrandedEmailHtml(input: EmailTemplateInput): string {
  const appUrl = getAppUrl();

  const codeBlock = input.code
    ? `<div style="background:#f0f7ff;border-radius:14px;padding:28px 20px;text-align:center;margin:24px 0;border:2px dashed #bfdbfe;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#64748b;">Your verification code</p>
        <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:16px;color:#001B44;font-family:monospace;">${input.code}</p>
        <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">Expires in 24 hours · Do not share this code</p>
      </div>`
    : "";

  const ctaBlock =
    input.ctaLabel && input.ctaUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
          <tr>
            <td style="border-radius:999px;background:#007BFF;">
              <a href="${input.ctaUrl}" style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:999px;">
                ${input.ctaLabel}
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">
          Or copy this link: <a href="${input.ctaUrl}" style="color:#007BFF;text-decoration:none;">${input.ctaUrl}</a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${input.title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#001B44;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbe4f0;">
            <tr>
              <td style="padding:28px 28px 16px;text-align:center;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);">
                <img src="cid:${EMAIL_LOGO_CID}" alt="BizList" width="180" height="auto" style="max-width:180px;height:auto;display:block;margin:0 auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 32px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#001B44;">${input.title}</h1>
                ${input.greeting ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${input.greeting}</p>` : ""}
                <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;white-space:pre-line;">${input.body}</p>
                ${input.htmlExtras ?? ""}
                ${codeBlock}
                ${ctaBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#001B44;color:#cbd5e1;font-size:12px;line-height:1.6;text-align:center;">
                ${input.footerNote ?? "You're receiving this because you have a BizList account."}
                <br />
                <a href="${appUrl}" style="color:#60a5fa;text-decoration:none;">Visit BizList</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildPlainTextEmail(input: EmailTemplateInput): string {
  const appUrl = getAppUrl();
  const lines = [
    input.title,
    "",
    input.greeting ?? "",
    input.body,
    "",
  ];

  if (input.code) {
    lines.push(`Verification code: ${input.code}`, "Expires in 24 hours.", "");
  }

  if (input.ctaLabel && input.ctaUrl) {
    lines.push(`${input.ctaLabel}: ${input.ctaUrl}`, "");
  }

  lines.push(input.footerNote ?? "You're receiving this because you have a BizList account.");
  lines.push(`Visit BizList: ${appUrl}`);

  return lines.filter(Boolean).join("\n");
}

type AssessmentEmailData = {
  businessName: string;
  overallScore: number;
  summary: string;
  recommendations: string[];
  topics: { label: string; score: number; summary?: string }[];
};

export const emailTemplates = {
  emailVerification: (name: string, code: string) => ({
    subject: "Your BizList verification code",
    title: "Confirm your email",
    greeting: `Hi ${name},`,
    body: "Thanks for signing up for BizList — the local business directory and community network.\n\nEnter the code below on the verification page to finish creating your account. Once verified, you can complete your profile, browse listings, and connect with businesses in your area.",
    code,
    footerNote: "You're receiving this because you started signing up for BizList.",
  }),

  welcome: (name: string) => ({
    subject: "Welcome to BizList",
    title: "Welcome to BizList",
    greeting: `Hi ${name},`,
    body: "Your account is ready. BizList helps local businesses get discovered, connect with neighbors, join community forums, and find collaboration opportunities.\n\nHere's what to do next:\n• Complete your profile so you appear in the directory\n• Browse local listings and follow businesses you care about\n• Join forum discussions and explore partnerships\n• Upgrade to Pro or Platinum for audits, leads, and AI growth tools",
    ctaLabel: "Complete your profile",
    ctaUrl: `${getAppUrl()}/profile/create`,
  }),

  firstLogin: (name: string) => ({
    subject: "You're signed in to BizList",
    title: "Welcome back to BizList",
    greeting: `Hi ${name},`,
    body: "You just signed in to your BizList account.\n\nPick up where you left off — check your messages, review new forum posts, explore collaborations, and see updates from businesses you follow.",
    ctaLabel: "Browse listings",
    ctaUrl: `${getAppUrl()}/listings`,
  }),

  profileComplete: (name: string) => ({
    subject: "Your BizList profile is live",
    title: "Profile published",
    greeting: `Hi ${name},`,
    body: "Your profile is set up and visible in the BizList community.\n\nYou can now list your business, follow others, post in the forum, message local connections, and apply for jobs or partnerships. If you're a business owner, add your listing details, photos, and services to start attracting local customers.",
    ctaLabel: "View directory",
    ctaUrl: `${getAppUrl()}/listings`,
  }),

  follow: (recipientName: string, actorName: string, businessName: string, link: string) => ({
    subject: `${actorName} followed ${businessName}`,
    title: "New follower",
    greeting: `Hi ${recipientName},`,
    body: `${actorName} just followed ${businessName} on BizList.\n\nFollowers see your posts in their feed and can message you directly. Consider welcoming new followers or posting an update to keep them engaged.`,
    ctaLabel: "View business",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  connection: (recipientName: string, actorName: string, businessName: string, link: string) => ({
    subject: `New connection request for ${businessName}`,
    title: "Connection request",
    greeting: `Hi ${recipientName},`,
    body: `${actorName} wants to connect with ${businessName} on BizList.\n\nReview their profile and accept or decline the request from your dashboard. Connections unlock messaging and networking features.`,
    ctaLabel: "Review request",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  comment: (recipientName: string, actorName: string, postTitle: string, link: string) => ({
    subject: `New comment on "${postTitle}"`,
    title: "New forum comment",
    greeting: `Hi ${recipientName},`,
    body: `${actorName} commented on your forum post "${postTitle}".\n\nJoin the conversation to keep the discussion going and build visibility in the local community.`,
    ctaLabel: "View comment",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  message: (recipientName: string, actorName: string, link: string) => ({
    subject: `New message from ${actorName}`,
    title: "New message",
    greeting: `Hi ${recipientName},`,
    body: `${actorName} sent you a message on BizList.\n\nOpen your inbox to read and reply. If you have Platinum with the virtual agent enabled, automated replies may already be helping your customers while you're away.`,
    ctaLabel: "Open conversation",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  forumPost: (name: string, postTitle: string, link: string) => ({
    subject: `Your forum post is live: ${postTitle}`,
    title: "Forum post published",
    greeting: `Hi ${name},`,
    body: `Your post "${postTitle}" is now live in the BizList community forum.\n\nOther members can comment, like, and share it. Check back for replies and consider cross-posting a summary to your business feed.`,
    ctaLabel: "View post",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  collaborationOffer: (
    recipientName: string,
    senderName: string,
    collaborationTitle: string,
    message: string,
    link: string,
  ) => ({
    subject: `New offer on your collaboration: ${collaborationTitle}`,
    title: "Someone responded to your collaboration",
    greeting: `Hi ${recipientName},`,
    body: `${senderName} submitted an offer on your collaboration "${collaborationTitle}":\n\n"${message}"\n\nLog in to view the full discussion, compare offers, and respond when you're ready.`,
    ctaLabel: "View collaboration",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  collaboration: (name: string, title: string) => ({
    subject: `Collaboration idea posted: ${title}`,
    title: "Collaboration idea published",
    greeting: `Hi ${name},`,
    body: `Your joint venture idea "${title}" is now visible to other local businesses on BizList.\n\nInterested partners can view requirements, comment, and submit offers. You'll be notified when someone responds.`,
    ctaLabel: "View collaborations",
    ctaUrl: `${getAppUrl()}/partnerships`,
  }),

  proUpgrade: (name: string, tier = "Pro") => ({
    subject: `Welcome to BizList ${tier}`,
    title: `You're now on the ${tier} plan`,
    greeting: `Hi ${name},`,
    body: `Your ${tier} plan is active.\n\n${
      tier === "Platinum"
        ? "You now have AI business audits with detailed topic breakdowns, local lead matching, a listing virtual agent, automated posts, outreach to matched leads, and welcome messages for new followers."
        : "You now have AI business audits, local lead previews, marketing tools, and expanded dashboard features."
    }\n\nOpen your dashboard to run your first audit, review leads, and publish content.`,
    ctaLabel: "Open dashboard",
    ctaUrl: `${getAppUrl()}/dashboard`,
  }),

  assessmentComplete: (name: string, data: AssessmentEmailData) => {
    const topicLabels = data.topics.length
      ? data.topics
      : [
          { label: "Website", score: data.overallScore },
          { label: "SEO", score: data.overallScore },
          { label: "Presence", score: data.overallScore },
          { label: "Profile", score: data.overallScore },
        ];

    const scoreColor = data.overallScore >= 75 ? "#059669" : data.overallScore >= 50 ? "#d97706" : "#dc2626";

    return {
      subject: `Your AI audit for ${data.businessName}: ${data.overallScore}/100`,
      title: "Assessment complete",
      greeting: `Hi ${name},`,
      body: `Your AI online presence audit for ${data.businessName} is ready.\n\n${data.summary}`,
      htmlExtras: `<div style="margin:24px 0 0;text-align:center;padding:20px;background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Overall score</p>
        <p style="margin:0;font-size:48px;font-weight:800;color:${scoreColor};">${data.overallScore}<span style="font-size:22px;color:#94a3b8;">/100</span></p>
      </div>
      ${buildAssessmentScoreGrid(topicLabels)}
      ${buildRecommendationList(data.recommendations)}
      <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#64748b;">Open the full report for detailed findings on website, SEO, content interaction, industry match, and location — plus recommended actions for each topic.</p>`,
      ctaLabel: "View full assessment",
      ctaUrl: `${getAppUrl()}/dashboard/assessment`,
    };
  },

  followDigest: (name: string, frequency: string, summary: string) => ({
    subject: `Your ${frequency} BizList follow digest`,
    title: `What's new from businesses you follow`,
    greeting: `Hi ${name},`,
    body: `Here's your ${frequency} summary of activity from businesses you follow on BizList:\n\n${summary}`,
    ctaLabel: "Open Posts feed",
    ctaUrl: `${getAppUrl()}/feed`,
    footerNote: "Manage digest frequency in My profile on BizList.",
  }),

  serviceOrderToBusiness: (
    ownerName: string,
    customerName: string,
    businessName: string,
    serviceName: string,
    details: string,
    ordersLink: string,
  ) => ({
    subject: `New order: ${serviceName} at ${businessName}`,
    title: "New customer order",
    greeting: `Hi ${ownerName},`,
    body: `${customerName} placed an order for "${serviceName}" at ${businessName}.\n\nOrder details:\n${details}\n\nRespond promptly from your BizList inbox to confirm availability, pricing, or next steps.`,
    ctaLabel: "Open orders inbox",
    ctaUrl: `${getAppUrl()}${ordersLink}`,
  }),

  serviceOrderConfirmation: (
    customerName: string,
    businessName: string,
    serviceName: string,
    details: string,
    listingLink: string,
  ) => ({
    subject: `Order confirmation — ${businessName}`,
    title: "We received your order",
    greeting: `Hi ${customerName},`,
    body: `Your order for "${serviceName}" at ${businessName} was sent successfully.\n\nOrder summary:\n${details}\n\nThe business will follow up with you soon. You can also message them directly on BizList if you have questions.`,
    ctaLabel: "View business",
    ctaUrl: `${getAppUrl()}${listingLink}`,
    footerNote: "You're receiving this because you placed an order on BizList.",
  }),
};
