#!/usr/bin/env node
/**
 * Sends follow digest emails for profiles opted into daily/weekly/monthly summaries.
 * Schedule via cron: node scripts/send-follow-digest.mjs weekly
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import sgMail from "@sendgrid/mail";
import { Resend } from "resend";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const LOGO_CID = "bizlist-logo";

for (const file of [".env.local", ".env"]) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) continue;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) process.env[key] = value;
  }
}

const frequency = process.argv[2];
if (!["daily", "weekly", "monthly"].includes(frequency)) {
  console.error("Usage: node scripts/send-follow-digest.mjs <daily|weekly|monthly>");
  process.exit(1);
}

const windowMs =
  frequency === "daily"
    ? 24 * 60 * 60 * 1000
    : frequency === "weekly"
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;

const since = new Date(Date.now() - windowMs).toISOString();
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bizlist.app";
const from = process.env.EMAIL_FROM ?? "BizList <info@operone2i.com>";
const sendgridReady = Boolean(process.env.SENDGRID_API_KEY);
const resendReady = Boolean(process.env.RESEND_API_KEY);
const emailReady = sendgridReady || resendReady;

if (sendgridReady) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const logoBase64 = fs.readFileSync(path.join(root, "public", "bizlist-logo.png")).toString("base64");
const resend = resendReady ? new Resend(process.env.RESEND_API_KEY) : null;

function buildDigestEmail(name, summary) {
  const title = "What's new from businesses you follow";
  const greeting = `Hi ${name},`;
  const body = `Here's your ${frequency} summary of activity from businesses you follow on BizList:\n\n${summary}`;
  const ctaUrl = `${appUrl}/feed`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#001B44;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbe4f0;">
          <tr><td style="padding:28px 28px 16px;text-align:center;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);">
            <img src="cid:${LOGO_CID}" alt="BizList" width="180" style="max-width:180px;height:auto;display:block;margin:0 auto;border:0;" />
          </td></tr>
          <tr><td style="padding:8px 28px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;color:#001B44;">${title}</h1>
            <p style="margin:0 0 16px;font-size:15px;color:#334155;">${greeting}</p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;white-space:pre-line;">${body}</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
              <tr><td style="border-radius:999px;background:#007BFF;">
                <a href="${ctaUrl}" style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Open Posts feed</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:18px 28px;background:#001B44;color:#cbd5e1;font-size:12px;text-align:center;">
            Manage digest frequency in My profile on BizList.<br />
            <a href="${appUrl}" style="color:#60a5fa;text-decoration:none;">Visit BizList</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `${title}\n\n${greeting}\n\n${body}\n\nOpen Posts feed: ${ctaUrl}\n\nVisit BizList: ${appUrl}`;

  return { html, text };
}

async function sendBrandedEmail(to, subject, name, summary) {
  const { html, text } = buildDigestEmail(name, summary);

  if (resendReady && resend) {
    await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      attachments: [{ content: logoBase64, filename: "bizlist-logo.png", contentId: LOGO_CID }],
    });
    return;
  }

  if (sendgridReady) {
    await sgMail.send({
      from,
      to,
      subject,
      html,
      text,
      attachments: [
        {
          content: logoBase64,
          filename: "bizlist-logo.png",
          type: "image/png",
          disposition: "inline",
          content_id: LOGO_CID,
        },
      ],
    });
  }
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: subscribers } = await client.query(
  `select id, display_name, email
   from public.profiles
   where follow_digest_frequency = $1 and email is not null`,
  [frequency],
);

let sent = 0;
for (const user of subscribers) {
  const { rows: follows } = await client.query(
    `select business_id from public.business_follows where follower_id = $1`,
    [user.id],
  );
  if (!follows.length) continue;

  const businessIds = follows.map((f) => f.business_id);
  const { rows: posts } = await client.query(
    `select bp.title, bp.created_at, b.name as business_name
     from public.business_posts bp
     join public.businesses b on b.id = bp.business_id
     where bp.business_id = any($1::uuid[])
       and bp.created_at >= $2
     order by bp.created_at desc
     limit 12`,
    [businessIds, since],
  );

  const summary =
    posts.length > 0
      ? posts
          .map(
            (post) =>
              `• ${post.business_name}: ${post.title} (${new Date(post.created_at).toLocaleDateString()})`,
          )
          .join("\n")
      : "No new posts from businesses you follow in this period. Browse Listings to discover more local businesses.";

  const subject = `Your ${frequency} BizList follow digest`;

  if (emailReady) {
    await sendBrandedEmail(user.email, subject, user.display_name || "there", summary);
  } else {
    console.info("[digest preview]", { to: user.email, subject, summary });
  }

  sent += 1;
}

await client.end();
console.log(`Done. Sent ${sent} ${frequency} digest(s).`);
