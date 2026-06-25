import sgMail from "@sendgrid/mail";
import { getEmailFrom, isEmailConfigured } from "./config";
import { buildBrandedEmailHtml } from "./templates";

type SendEmailInput = {
  to: string;
  subject: string;
  title: string;
  greeting?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export async function sendAppEmail(input: SendEmailInput): Promise<void> {
  if (!input.to) return;

  const html = buildBrandedEmailHtml(input);

  if (!isEmailConfigured()) {
    console.info("[AllConnect email preview]", {
      to: input.to,
      subject: input.subject,
      title: input.title,
    });
    return;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  await sgMail.send({
    from: getEmailFrom(),
    to: input.to,
    subject: input.subject,
    html,
  });
}

export async function sendTemplateEmail(
  to: string,
  template: Omit<SendEmailInput, "to">,
): Promise<void> {
  await sendAppEmail({ to, ...template });
}
