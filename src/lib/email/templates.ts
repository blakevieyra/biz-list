import { getAppUrl, getLogoUrl } from "./config";

export function buildBrandedEmailHtml(input: {
  title: string;
  greeting?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const appUrl = getAppUrl();
  const logoUrl = getLogoUrl();
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
                <img src="${logoUrl}" alt="AllConnect" width="180" style="max-width:180px;height:auto;display:block;margin:0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 32px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#001B44;">${input.title}</h1>
                ${input.greeting ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${input.greeting}</p>` : ""}
                <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;white-space:pre-line;">${input.body}</p>
                ${ctaBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#001B44;color:#cbd5e1;font-size:12px;line-height:1.6;text-align:center;">
                ${input.footerNote ?? "You're receiving this because you have an AllConnect account."}
                <br />
                <a href="${appUrl}" style="color:#60a5fa;text-decoration:none;">Visit AllConnect</a>
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
  welcome: (name: string) => ({
    subject: "Welcome to AllConnect",
    title: "Welcome to AllConnect",
    greeting: `Hi ${name},`,
    body: "Your account is ready. AllConnect helps local businesses and organizations get discovered, connect with neighbors, join community forums, and find collaboration opportunities.\n\nComplete your profile to appear in the directory and start building your local network.",
    ctaLabel: "Complete your profile",
    ctaUrl: `${getAppUrl()}/profile/create`,
  }),

  firstLogin: (name: string) => ({
    subject: "You're signed in to AllConnect",
    title: "Welcome back to AllConnect",
    greeting: `Hi ${name},`,
    body: "You just signed in to your AllConnect account. Explore the directory, join forum discussions, and connect with businesses in your area.",
    ctaLabel: "Open dashboard",
    ctaUrl: `${getAppUrl()}/directory`,
  }),

  profileComplete: (name: string) => ({
    subject: "Your AllConnect profile is live",
    title: "Profile published",
    greeting: `Hi ${name},`,
    body: "Your profile is set up and you're ready to participate in the AllConnect community. You can now list your business, follow others, post in the forum, and message local connections.",
    ctaLabel: "View directory",
    ctaUrl: `${getAppUrl()}/directory`,
  }),

  follow: (recipientName: string, actorName: string, businessName: string, link: string) => ({
    subject: `${actorName} followed ${businessName}`,
    title: "New follower",
    greeting: `Hi ${recipientName},`,
    body: `${actorName} followed ${businessName} on AllConnect.`,
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
    body: `${actorName} sent you a message on AllConnect.`,
    ctaLabel: "Open conversation",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  forumPost: (name: string, postTitle: string, link: string) => ({
    subject: `Your forum post is live: ${postTitle}`,
    title: "Forum post published",
    greeting: `Hi ${name},`,
    body: `Your post "${postTitle}" is now live in the AllConnect community forum.`,
    ctaLabel: "View post",
    ctaUrl: `${getAppUrl()}${link}`,
  }),

  collaboration: (name: string, title: string) => ({
    subject: `Collaboration idea posted: ${title}`,
    title: "Collaboration idea published",
    greeting: `Hi ${name},`,
    body: `Your joint venture idea "${title}" is now visible to other local businesses on AllConnect.`,
    ctaLabel: "View collaborations",
    ctaUrl: `${getAppUrl()}/collaborate`,
  }),

  proUpgrade: (name: string) => ({
    subject: "Welcome to AllConnect Pro",
    title: "You're now a Pro member",
    greeting: `Hi ${name},`,
    body: "Your Pro plan is active. You now have access to AI business assessments and local lead matching based on customer interests in your area.",
    ctaLabel: "Open Pro dashboard",
    ctaUrl: `${getAppUrl()}/pro`,
  }),

  assessmentComplete: (name: string, score: number) => ({
    subject: "Your AI business assessment is ready",
    title: "Assessment complete",
    greeting: `Hi ${name},`,
    body: `Your AI business assessment is ready with an overall score of ${score}/100. Review SEO, online presence, and clarity recommendations in your Pro dashboard.`,
    ctaLabel: "View assessment",
    ctaUrl: `${getAppUrl()}/pro/assessment`,
  }),
};
