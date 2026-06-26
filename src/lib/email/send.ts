import { Resend } from "resend";
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
    console.info("[BizList email — NOT SENT, no RESEND_API_KEY configured]", {
      to: input.to,
      subject: input.subject,
    });
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const from = getEmailFrom();

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html,
  });

  if (error) {
    console.error("[BizList email send error]", error);
  }
}

export async function sendTemplateEmail(
  to: string,
  template: Omit<SendEmailInput, "to">,
): Promise<void> {
  await sendAppEmail({ to, ...template });
}
