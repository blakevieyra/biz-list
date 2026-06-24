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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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
const from = process.env.EMAIL_FROM ?? "hello@bizlist.app";
const sendgridReady = Boolean(process.env.SENDGRID_API_KEY);

if (sendgridReady) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
      : "No new posts from businesses you follow in this period.";

  const subject = `Your ${frequency} BizList follow digest`;
  const text = `Hi ${user.display_name || "there"},\n\n${summary}\n\nOpen your feed: ${appUrl}/feed\n\nManage preferences: ${appUrl}/profile`;

  if (sendgridReady) {
    await sgMail.send({ from, to: user.email, subject, text });
  } else {
    console.info("[digest preview]", { to: user.email, subject, text });
  }

  sent += 1;
}

await client.end();
console.log(`Done. Sent ${sent} ${frequency} digest(s).`);
