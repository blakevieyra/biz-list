/**
 * fix-notification-links.mjs
 * One-time patch to fix broken notification links in the database.
 * Run with: node fix-notification-links.mjs
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function parseEnvFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

const env = parseEnvFile('.env.local');
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
const BLAKE_ID = '3d780e6d-579c-412c-a7e3-acc88ddf66ed';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('🔧 Fixing notification links...\n');

  // 1. Fix "New follower" notifications that link to /dashboard/followers
  //    → should link to the follower's public profile page
  const { data: followerNotifs, error: e1 } = await supabase
    .from('notifications')
    .select('id')
    .eq('title', 'New follower')
    .eq('link', '/dashboard/followers');

  if (e1) { console.error('Error fetching follower notifs:', e1.message); }
  else if (followerNotifs?.length) {
    const { error: u1 } = await supabase
      .from('notifications')
      .update({ link: `/listings/people/${BLAKE_ID}` })
      .eq('title', 'New follower')
      .eq('link', '/dashboard/followers');
    if (u1) console.error('Error updating follower notifs:', u1.message);
    else console.log(`✅ Fixed ${followerNotifs.length} "New follower" notification(s) → /listings/people/${BLAKE_ID}`);
  } else {
    console.log('⏭  No stale "New follower" notifications to fix');
  }

  // 2. Fix "New partnership request" notifications that link to /dashboard/collaborations
  //    → should link to /partnerships
  const { data: partnerNotifs, error: e2 } = await supabase
    .from('notifications')
    .select('id')
    .eq('title', 'New partnership request')
    .eq('link', '/dashboard/collaborations');

  if (e2) { console.error('Error fetching partnership notifs:', e2.message); }
  else if (partnerNotifs?.length) {
    const { error: u2 } = await supabase
      .from('notifications')
      .update({ link: '/partnerships' })
      .eq('title', 'New partnership request')
      .eq('link', '/dashboard/collaborations');
    if (u2) console.error('Error updating partnership notifs:', u2.message);
    else console.log(`✅ Fixed ${partnerNotifs.length} "New partnership request" notification(s) → /partnerships`);
  } else {
    console.log('⏭  No stale "New partnership request" notifications to fix');
  }

  // 3. Fix "New message from Blake Vieyra" seed notifications that link to bare /messages
  //    → find the conversation between Blake and the notification owner and link to it
  const { data: msgNotifs, error: e3 } = await supabase
    .from('notifications')
    .select('id, user_id')
    .eq('title', 'New message from Blake Vieyra')
    .eq('link', '/messages');

  if (e3) { console.error('Error fetching message notifs:', e3.message); }
  else if (msgNotifs?.length) {
    let fixed = 0;
    for (const notif of msgNotifs) {
      // Find conversation between Blake and this user
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_a.eq.${BLAKE_ID},participant_b.eq.${notif.user_id}),and(participant_a.eq.${notif.user_id},participant_b.eq.${BLAKE_ID})`
        )
        .maybeSingle();

      if (conv?.id) {
        const { error: u3 } = await supabase
          .from('notifications')
          .update({ link: `/messages/${conv.id}` })
          .eq('id', notif.id);
        if (!u3) fixed++;
      }
    }
    console.log(`✅ Fixed ${fixed}/${msgNotifs.length} "New message" notification(s) → /messages/[conversationId]`);
  } else {
    console.log('⏭  No stale "New message" notifications to fix');
  }

  // 4. Fix "New job application received" seed notifications that link to /dashboard/applications
  //    → find the real application from Blake for each business owner and link to it
  const { data: appNotifs, error: e4 } = await supabase
    .from('notifications')
    .select('id, user_id')
    .eq('title', 'New job application received')
    .eq('link', '/dashboard/applications');

  if (e4) { console.error('Error fetching app notifs:', e4.message); }
  else if (appNotifs?.length) {
    let fixed = 0;
    for (const notif of appNotifs) {
      // Find the business owned by this notification recipient
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', notif.user_id)
        .maybeSingle();

      if (biz?.id) {
        // Find Blake's application to this business
        const { data: app } = await supabase
          .from('job_applications')
          .select('id')
          .eq('business_id', biz.id)
          .eq('applicant_id', BLAKE_ID)
          .maybeSingle();

        if (app?.id) {
          const { error: u4 } = await supabase
            .from('notifications')
            .update({ link: `/applications/${app.id}` })
            .eq('id', notif.id);
          if (!u4) fixed++;
        }
      }
    }
    console.log(`✅ Fixed ${fixed}/${appNotifs.length} "New job application" notification(s) → /applications/[id]`);
    if (fixed < appNotifs.length) {
      console.log(`   (${appNotifs.length - fixed} kept at /dashboard/applications — no matching application found)`);
    }
  } else {
    console.log('⏭  No stale "New job application" notifications to fix');
  }

  console.log('\n✅ Done. Reload your app to see updated notification links.');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
