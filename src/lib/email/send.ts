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
    console.info("[BizList email] sending to", input.to, "from", getEmailFrom(), "subject:", input.subject);
    await sgMail.send({
      from: getEmailFrom(),
      to: input.to,
      subject: input.subject,
      html,
    });
    console.info("[BizList email] sent OK");
  } catch (err: unknown) {
    const sgErr = err as { message?: string; response?: { body?: unknown; status?: number } };
    console.error("[BizList email send error]", {
      message: sgErr?.message,
      status: sgErr?.response?.status,
      body: JSON.stringify(sgErr?.response?.body),
      from: getEmailFrom(),
      to: input.to,
    });
  }
}

export async function sendTemplateEmail(
  to: string,
  template: Omit<SendEmailInput, "to">,
): Promise<void> {
  await sendAppEmail({ to, ...template });
}
