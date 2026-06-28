import sgMail from "@sendgrid/mail";
import { Resend } from "resend";
import { getEmailFrom, isEmailConfigured } from "./config";
import { EMAIL_LOGO_CID, getLogoInlineAttachment } from "./logo";
import { buildBrandedEmailHtml, buildPlainTextEmail } from "./templates";

type SendEmailInput = {
  to: string;
  subject: string;
  title: string;
  greeting?: string;
  body: string;
  htmlExtras?: string;
  code?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

async function sendViaResend(input: SendEmailInput, html: string, text: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const logo = getLogoInlineAttachment();

  await resend.emails.send({
    from: getEmailFrom(),
    to: input.to,
    subject: input.subject,
    html,
    text,
    attachments: [
      {
        content: logo.content,
        filename: logo.filename,
        contentId: EMAIL_LOGO_CID,
      },
    ],
  });
}

async function sendViaSendGrid(input: SendEmailInput, html: string, text: string): Promise<void> {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

  await sgMail.send({
    from: getEmailFrom(),
    to: input.to,
    subject: input.subject,
    html,
    text,
    attachments: [getLogoInlineAttachment()],
  });
}

export async function sendAppEmail(input: SendEmailInput): Promise<void> {
  if (!input.to) return;

  const html = buildBrandedEmailHtml(input);
  const text = buildPlainTextEmail(input);

  if (!isEmailConfigured()) {
    console.info("[BizList email — NOT SENT, no email provider configured]", {
      to: input.to,
      subject: input.subject,
    });
    return;
  }

  try {
    console.info("[BizList email] sending to", input.to, "from", getEmailFrom(), "subject:", input.subject);

    if (process.env.RESEND_API_KEY) {
      await sendViaResend(input, html, text);
    } else if (process.env.SENDGRID_API_KEY) {
      await sendViaSendGrid(input, html, text);
    }

    console.info("[BizList email] sent OK");
  } catch (err: unknown) {
    const error = err as { message?: string; response?: { body?: unknown; status?: number } };
    console.error("[BizList email send error]", {
      message: error?.message,
      status: error?.response?.status,
      body: JSON.stringify(error?.response?.body),
      from: getEmailFrom(),
      to: input.to,
    });
  }
}

export async function sendRawHtmlEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (!input.to) return;

  if (!isEmailConfigured()) {
    console.info("[BizList email — NOT SENT, no email provider configured]", {
      to: input.to,
      subject: input.subject,
    });
    return;
  }

  const logo = getLogoInlineAttachment();

  try {
    console.info("[BizList email] sending raw to", input.to, "subject:", input.subject);

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      await resend.emails.send({
        from: getEmailFrom(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: [{ content: logo.content, filename: logo.filename, contentId: EMAIL_LOGO_CID }],
      });
    } else if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      await sgMail.send({
        from: getEmailFrom(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: [logo],
      });
    }

    console.info("[BizList email] sent OK");
  } catch (err: unknown) {
    const error = err as { message?: string; response?: { body?: unknown; status?: number } };
    console.error("[BizList email send error]", {
      message: error?.message,
      status: error?.response?.status,
      body: JSON.stringify(error?.response?.body),
    });
    throw error;
  }
}

export async function sendTemplateEmail(
  to: string,
  template: Omit<SendEmailInput, "to">,
): Promise<void> {
  await sendAppEmail({ to, ...template });
}
