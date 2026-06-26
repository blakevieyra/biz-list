export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? "BizList <hello@bizlist.app>";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getLogoUrl(): string {
  return `${getAppUrl()}/bizlist-logo.png`;
}
