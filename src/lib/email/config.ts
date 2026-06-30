export function getAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? "BizList <info@operone2i.com>";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY);
}
