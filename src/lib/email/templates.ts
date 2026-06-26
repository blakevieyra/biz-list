import { getAppUrl, getLogoUrl } from "./config";

export function buildBrandedEmailHtml(input: {
  title: string;
  greeting?: string;
  body: string;
  code?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const appUrl = getAppUrl();
  const logoUrl = getLogoUrl();

  const codeBlock = input.code
    ? `<div style="background:#f0f7ff;border-radius:14px;padding:28px 20px;text-align:center;margin:24px 0;border:2px dashed #bfdbfe;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#64748b;">Your verification code</p>
        <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:16px;color:#001B44;font-family:monospace;">${input.code}</p>
        <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">Expires in 24 hours · Do not share this code</p>
      </div>`
    : "";

  const ctaBlock =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:28px 0 0;">
          <a href="${input.ctaUrl}" style="display:inline-block;background:#007BFF;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:14px;">
            ${input.ctaLabel}
          </a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#001B44;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbe4f0;">
            <tr>
              <td style="padding:28px 28px 16px;text-align:center;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);">
                <img src="${logoUrl}" alt="BizList" width="180" style="max-width:180px;height:auto;display:block;margin:0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 32px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#001B44;">${input.title}</h1>
                ${input.greeting ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${input.greeting}</p>` : ""}
                <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;white-space:pre-line;">${input.body}</p>
                ${codeBlock}
                ${ctaBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#001B44;color:#cbd5e1;font-size:12px;line-height:1.6;text-align:center;">
                ${input.footerNote ?? "You're receiving this because you have an BizList account."}
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

export const emailTemplates = {
  emailVerification: (name: string, code: string) => ({
    subject: "Your BizList verification code",
    title: "Confirm your email",
    greeting: `Hi ${name},`,
    body: "Thanks for signing up for BizList. Enter the code below on the verification page to finish creating your account.",
    code,
    footerNote: "You're receiving this because you started signing up for BizList.",
  }),

  welcome: (name: string) => ({
    subject: "Welcome to BizList",
    title: "Welcome to BizList",
    greeting: `Hi ${name},`,
    body: "Your account is ready. BizList helps local businesses and organizations get discovered, connect with neighbors, join community forums, and find collaboration opportunities.\n\nComplete your profile to appear in the directory and start building your local network.",
    ctaLabel: "Complete your profile",
    ctaUrl: `${getAppUrl()}/profile/create`,
  }),

  firstLogin: (name: string) => ({
    subject: "You're signed in to BizList",
    title: "Welcome back to BizList",
    greeting: `Hi ${name},`,
    body: "You just signed in to your BizList account. Explore the directory, join forum discussions, and connect with businesses in your area.",
    ctaLabel: "Open dashboard",
    ctaUrl: `${getAppUrl()}/listings`,
  }),

  profileComplete: (name: string) => ({
    subject: "Your BizList profile is live",
    title: "Profile published",
    greeting: `Hi ${name},`,
    body: "Your profile is set up and you're ready to participate in the BizList community. You can now list your business, follow others, post in the forum, and message local connections.",
    ctaLabel: "View directory",
    ctaUrl: `${getAppUrl()}/listings`,
  }),

  follow: (recipientName: string, actorName: string, businessName: string, link: string) => ({
    subject: `${actorName} followed ${businessName}`,
    title: "New follower",
    greeting: `Hi ${recipientName},`,
    body: `${actorName} followed ${businessName} on BizList.`,
    ctaLabel: "View business",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  connection: (recipientName: string, actorName: string, businessName: string, link: string) => ({
    subject: `New connection request for ${businessName}`,
    title: "Connection request",
    greeting: `Hi ${recipientName},`,
    body: `${actorName} wants to connect with ${businessName}.`,
    ctaLabel: "Review request",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  comment: (recipientName: string, actorName: string, postTitle: string, link: string) => ({
    subject: `New comment on "${postTitle}"`,
    title: "New forum comment",
    greeting: `Hi ${recipientName},`,
    body: `${actorName} commented on your forum post "${postTitle}".`,
    ctaLabel: "View comment",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  message: (recipientName: string, actorName: string, link: string) => ({
    subject: `New message from ${actorName}`,
    title: "New message",
    greeting: `Hi ${recipientName},`,
    body: `${actorName} sent you a message on BizList.`,
    ctaLabel: "Open conversation",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  forumPost: (name: string, postTitle: string, link: string) => ({
    subject: `Your forum post is live: ${postTitle}`,
    title: "Forum post published",
    greeting: `Hi ${name},`,
    body: `Your post "${postTitle}" is now live in the BizList community forum.`,
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
    body: `${senderName} submitted an offer on your collaboration "${collaborationTitle}":\n\n"${message}"\n\nLog in to view the full discussion and respond.`,
    ctaLabel: "View collaboration",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  collaboration: (name: string, title: string) => ({
    subject: `Collaboration idea posted: ${title}`,
    title: "Collaboration idea published",
    greeting: `Hi ${name},`,
    body: `Your joint venture idea "${title}" is now visible to other local businesses on BizList.`,
    ctaLabel: "View collaborations",
    ctaUrl: `${getAppUrl()}/partnerships`,
  }),

  proUpgrade: (name: string, tier = "Pro") => ({
    subject: `Welcome to BizList ${tier}`,
    title: `You're now on the ${tier} plan`,
    greeting: `Hi ${name},`,
    body: `Your ${tier} plan is active. Open your business dashboard for posts, networking, leads, and growth tools.`,
    ctaLabel: "Open dashboard",
    ctaUrl: `${getAppUrl()}/dashboard`,
  }),

  assessmentComplete: (name: string, score: number) => ({
    subject: "Your AI business assessment is ready",
    title: "Assessment complete",
    greeting: `Hi ${name},`,
    body: `Your AI business assessment is ready with an overall score of ${score}/100. Review SEO, online presence, and clarity recommendations in your Pro dashboard.`,
    ctaLabel: "View assessment",
    ctaUrl: `${getAppUrl()}/dashboard/assessment`,
  }),

  followDigest: (name: string, frequency: string, summary: string) => ({
    subject: `Your ${frequency} BizList follow digest`,
    title: `What's new from businesses you follow`,
    greeting: `Hi ${name},`,
    body: summary,
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
    body: `${customerName} placed an order for "${serviceName}" at ${businessName}.\n\n${details}\n\nView and respond from your BizList inbox.`,
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
    body: `Your order for "${serviceName}" at ${businessName} was sent successfully.\n\n${details}\n\nThe business will follow up with you soon.`,
    ctaLabel: "View business",
    ctaUrl: `${getAppUrl()}${listingLink}`,
    footerNote: "You're receiving this because you placed an order on BizList.",
  }),
};
