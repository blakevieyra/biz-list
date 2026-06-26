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
    console.info("[BizList email — NOT SENT, SENDGRID_API_KEY not configured]", {
      to: input.to,
      subject: input.subject,
    });
    return;
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      from: getEmailFrom(),
      to: input.to,
      subject: input.subject,
      html,
    });
  } catch (err: unknown) {
    console.error("[BizList email send error]", err instanceof Error ? err.message : err);
  }
}

export async function sendTemplateEmail(
  to: string,
  template: Omit<SendEmailInput, "to">,
): Promise<void> {
  await sendAppEmail({ to, ...template });
}
