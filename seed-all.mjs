/**
 * seed-all.mjs
 * Comprehensive seed script for BizList / AllConnect.
 * Run with: node seed-all.mjs
 *
 * Bypasses RLS via service role key. Re-runnable — uses upsert / check-before-insert.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// 1. Parse .env.local manually
// ---------------------------------------------------------------------------
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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// 2. Known constants
// ---------------------------------------------------------------------------
const BLAKE_ID = '3d780e6d-579c-412c-a7e3-acc88ddf66ed';

// ---------------------------------------------------------------------------
// 3. Helpers
// ---------------------------------------------------------------------------
function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

async function upsertOne(table, data, conflictCols) {
  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, { onConflict: conflictCols, ignoreDuplicates: false })
    .select();
  if (error) throw new Error(`upsert ${table}: ${error.message}`);
  return result?.[0];
}

async function insertOne(table, data) {
  const { data: result, error } = await supabase.from(table).insert(data).select();
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  return result?.[0];
}

// Insert only if no matching row exists (for tables without clean upsert key).
async function insertIfMissing(table, matchCols, data) {
  const query = supabase.from(table).select('id').limit(1);
  for (const [col, val] of Object.entries(matchCols)) {
    query.eq(col, val);
  }
  const { data: existing } = await query;
  if (existing && existing.length > 0) {
    log('⏭', `  ${table} row already exists — skipping`);
    return existing[0];
  }
  return insertOne(table, data);
}

// ---------------------------------------------------------------------------
// 4. Fetch existing businesses + their owners
// ---------------------------------------------------------------------------
async function fetchBusinesses() {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, owner_id, category, city, state, is_hiring, intents');
  if (error) throw new Error(`fetch businesses: ${error.message}`);
  return data;
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email, role')
    .eq('id', userId)
    .single();
  if (error) throw new Error(`fetch profile ${userId}: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// 5. Per-business content generators
// ---------------------------------------------------------------------------
function postsForBusiness(business, ownerId) {
  const { id: business_id, name, category } = business;
  const base = { business_id, author_id: ownerId, media_urls: [] };

  const pools = {
    bakery: [
      {
        post_type: 'update',
        title: 'Fresh sourdough every morning at 7 AM',
        body: `We've extended our bakery hours to start at 7 AM so early risers can grab a warm loaf of our classic sourdough before the morning rush. ${name} is proud to mill our own flour from locally sourced wheat — come taste the difference!`,
      },
      {
        post_type: 'deal',
        title: '20% off all pastries on Tuesdays',
        body: `Every Tuesday is Pastry Day at ${name}! Bring in this post for 20% off croissants, danishes, and our beloved cinnamon twists. Valid all day while supplies last.`,
      },
      {
        post_type: 'job',
        title: 'Now hiring: Morning Prep Baker',
        body: `${name} is looking for a passionate morning prep baker to join our team. Hours are 4 AM–noon, Tuesday through Saturday. Experience with laminated doughs a plus. Apply through our BizList profile!`,
      },
      {
        post_type: 'update',
        title: 'New seasonal menu — Summer Berry Collection',
        body: `Our pastry chefs have been busy! This summer we're debuting a rotating berry collection: strawberry basil tart, blueberry lemon scone, and a blackberry galette. Limited quantities daily.`,
      },
      {
        post_type: 'update',
        title: 'Partnership with Riverbend Community Market',
        body: `Excited to announce that ${name} will now be carrying a selection of our breads at the Riverbend Community Market every Saturday. Look for our signature blue packaging!`,
      },
    ],
    it: [
      {
        post_type: 'update',
        title: 'New managed IT security packages for 2026',
        body: `${name} has launched three tiered managed security packages designed for small to mid-size businesses. Starting at $299/month, our packages include 24/7 monitoring, monthly vulnerability scans, and guaranteed 4-hour response SLAs.`,
      },
      {
        post_type: 'deal',
        title: 'Free network audit for new clients — June only',
        body: `Book a discovery call in June and receive a complimentary network infrastructure audit ($500 value). We'll identify vulnerabilities, bandwidth bottlenecks, and cost-saving consolidation opportunities.`,
      },
      {
        post_type: 'job',
        title: 'Hiring: Senior Systems Engineer (Remote/Hybrid)',
        body: `${name} is growing! We need an experienced Systems Engineer proficient in VMware, Azure AD, and network security. Hybrid schedule — 2 days on-site, 3 remote. Competitive salary + benefits.`,
      },
      {
        post_type: 'update',
        title: 'B2B Opportunity: IT subcontracting for regional firms',
        body: `We're opening our subcontracting roster to qualified IT freelancers and small firms in the region. If you have CCNA, CompTIA Security+, or equivalent credentials, reach out. We have more demand than capacity right now.`,
      },
      {
        post_type: 'video',
        title: 'Watch: 5-minute guide to patching Windows Server 2022',
        body: `Our lead engineer walks you through the critical April 2026 Windows Server patches. Watch the full tutorial on our channel or request a written guide through our profile.`,
      },
    ],
    restaurant: [
      {
        post_type: 'update',
        title: 'Farm-to-table summer menu is live',
        body: `${name} is proud to debut our summer farm-to-table menu featuring ingredients from six local farms. Highlights include heirloom tomato gazpacho, grilled peach flatbread, and our signature herb-crusted trout.`,
      },
      {
        post_type: 'deal',
        title: 'Happy Hour extended: 3–6 PM weekdays',
        body: `We've extended our happy hour to three hours, Monday through Friday. Enjoy $4 draft beers, $6 house wines, and half-price appetizers. Perfect for the after-work crowd!`,
      },
      {
        post_type: 'job',
        title: 'Seeking experienced line cooks — immediate openings',
        body: `${name} is hiring two line cooks for our dinner service. Must have 2+ years of restaurant experience. We offer flexible scheduling, staff meals, and a positive kitchen culture. DM or apply through BizList.`,
      },
      {
        post_type: 'update',
        title: 'Private dining room now available for events',
        body: `Host your next corporate dinner, birthday, or rehearsal in our newly renovated private dining room. Seats up to 30 guests, includes AV setup, and dedicated service staff. Inquire for pricing.`,
      },
      {
        post_type: 'update',
        title: 'Partnering with local breweries for a tap takeover series',
        body: `Starting next month, ${name} will host monthly tap takeover nights featuring rotating local craft breweries. First up: Riverbend Brewing Co. Reserve your spot today!`,
      },
    ],
    default: [
      {
        post_type: 'update',
        title: `Big news from ${name}`,
        body: `${name} is thrilled to share some exciting updates with our community. We've been working hard behind the scenes to bring you better service, expanded offerings, and new ways to connect with our team.`,
      },
      {
        post_type: 'deal',
        title: 'Limited-time offer for returning customers',
        body: `To celebrate our growth on BizList, ${name} is offering a 15% loyalty discount to any returning customer this month. Show your profile at checkout or mention this post online.`,
      },
      {
        post_type: 'job',
        title: "We're growing — join our team!",
        body: `${name} has open positions for motivated individuals who want to be part of a tight-knit local business. We value reliability, curiosity, and a great attitude. Reach out to learn more.`,
      },
      {
        post_type: 'update',
        title: 'B2B spotlight: looking for local partners',
        body: `${name} is actively seeking B2B partnerships with complementary local businesses. Whether it's cross-promotion, referral arrangements, or joint offerings — let's talk. Send a collaboration request through our BizList profile.`,
      },
      {
        post_type: 'update',
        title: 'Community involvement update',
        body: `This quarter ${name} has been volunteering at local community events and sponsoring youth programs in the area. We believe business success and community investment go hand in hand.`,
      },
    ],
  };

  const catKey = (category || '').toLowerCase();
  let templates = pools.default;
  if (catKey.includes('bak') || catKey.includes('bread') || catKey.includes('pastry')) {
    templates = pools.bakery;
  } else if (catKey.includes('it') || catKey.includes('tech') || catKey.includes('software') || catKey.includes('engineer')) {
    templates = pools.it;
  } else if (catKey.includes('restaurant') || catKey.includes('food') || catKey.includes('diner') || catKey.includes('cafe')) {
    templates = pools.restaurant;
  }

  return templates.slice(0, 5).map((t) => ({ ...base, ...t }));
}

function eventsForBusiness(business, ownerId) {
  const { id: business_id, name, city, state } = business;
  const base = {
    business_id,
    author_id: ownerId,
    location: `${name}, ${city}, ${state}`,
    city: city || 'Springfield',
    state: state || 'IL',
    status: 'published',
  };

  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 14);
  futureDate1.setHours(10, 0, 0, 0);

  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 30);
  futureDate2.setHours(14, 0, 0, 0);

  const end1 = new Date(futureDate1);
  end1.setHours(13, 0, 0, 0);

  const end2 = new Date(futureDate2);
  end2.setHours(17, 0, 0, 0);

  return [
    {
      ...base,
      title: `${name} Open House`,
      description: `Join us for an informal open house at ${name}! Meet our team, tour our space, and learn about what we do. Refreshments provided. Great opportunity to network with other local businesses and customers.`,
      category: 'open_house',
      starts_at: futureDate1.toISOString(),
      ends_at: end1.toISOString(),
      capacity: 50,
    },
    {
      ...base,
      title: `${name} Community Workshop`,
      description: `${name} is hosting a hands-on community workshop. Whether you're a first-timer or enthusiast, come learn something new from our expert team. Space is limited — RSVP through BizList to save your spot.`,
      category: 'workshop',
      starts_at: futureDate2.toISOString(),
      ends_at: end2.toISOString(),
      capacity: 20,
    },
  ];
}

function reviewsForBusiness(business) {
  const { id: business_id, name, category } = business;
  const catLower = (category || '').toLowerCase();

  let rating1 = 5;
  let body1 = `${name} exceeded all my expectations. The team is professional, the quality is outstanding, and they genuinely care about their customers. I've recommended them to everyone I know.`;
  let rating2 = 4;
  let body2 = `Really solid experience overall. ${name} has a great product/service and the staff are friendly and knowledgeable. A few minor things could be smoother but I'll definitely be back.`;

  if (catLower.includes('bak')) {
    body1 = `Riverbend's sourdough is hands-down the best bread I've had outside of San Francisco. Everything is baked fresh, the staff knows their craft, and the shop itself is cozy and welcoming. Five stars without hesitation.`;
    body2 = `Love coming here on Saturday mornings. The croissants are incredible and the coffee pairs perfectly. Only reason I'm not giving 5 stars is they sometimes sell out of cinnamon twists before noon — come earlier than I do!`;
  } else if (catLower.includes('it') || catLower.includes('tech')) {
    body1 = `${name} handled our entire infrastructure migration without a single hiccup. Their engineers are sharp, responsive, and they communicate in plain English — no jargon. Worth every penny for peace of mind.`;
    body2 = `We've been using ${name} for managed IT support for about six months. Response times are fast, the team is helpful, and they proactively flagged a security issue before it became a problem. Solid choice.`;
  }

  return [
    { business_id, author_id: BLAKE_ID, rating: rating1, body: body1 },
    // Second review from blake would violate unique constraint; skip second or adjust
    // We keep only one per the unique(business_id, author_id) constraint.
  ];
}

function jobApplicationsForBusiness(business) {
  const { id: business_id, name } = business;
  return [
    {
      business_id,
      applicant_id: BLAKE_ID,
      message: `I'm very interested in joining the ${name} team. I have a diverse background and am eager to contribute to your growth. Please find my cover letter and experience summary below.`,
      cover_letter: `Dear Hiring Manager at ${name},\n\nI came across your job opening on BizList and was immediately excited by the opportunity. Your business's reputation in the community and commitment to quality align perfectly with my own values.\n\nIn my experience I have developed strong skills in communication, problem-solving, and adaptability. I am a quick learner who thrives in collaborative environments. I would love the opportunity to discuss how my background can contribute to your team.\n\nThank you for your consideration.\n\nSincerely,\nBlake Vieyra`,
      resume_snapshot: `Blake Vieyra\nblake.vieyra@gmail.com\n\nEXPERIENCE\n- Business Analyst, AllConnect Platform (2024–present): Conducted market research, coordinated partnerships between local businesses, and managed client relationships across multiple verticals.\n- Freelance Consultant (2022–2024): Advised small businesses on operational improvements, digital marketing strategies, and community engagement.\n\nEDUCATION\nB.S. Business Administration\n\nSKILLS\nProject management, client relations, data analysis, social media marketing, Microsoft Office, Google Workspace`,
      status: 'pending',
      form_answers: { availability: 'Full-time, immediate', salary_expectation: 'Negotiable' },
      resume_attached: false,
    },
  ];
}

function collaborationsForBusinessPair(bizA, bizB) {
  const bothOwners = [bizA.owner_id, bizB.owner_id];
  const authorId = bothOwners[0]; // bizA owner proposes

  return [
    {
      author_id: authorId,
      business_id: bizA.id,
      title: `Cross-promotion partnership: ${bizA.name} × ${bizB.name}`,
      summary: `${bizA.name} is proposing a mutual cross-promotion arrangement with ${bizB.name}. We'd feature each other's businesses in our newsletters, social posts, and in-store/on-site signage to drive foot traffic to both locations.`,
      looking_for: 'A committed local business partner willing to co-create content and share customer audiences in a non-competing arrangement.',
      location: bizA.city || 'Local Area',
      status: 'open',
      collaboration_type: 'proposal',
      requirements: 'Min 500 combined social following. Willingness to co-author two posts per month. No competing product lines.',
    },
    {
      author_id: authorId,
      business_id: bizA.id,
      title: `B2B supply arrangement: ${bizA.name} sourcing from ${bizB.name}`,
      summary: `${bizA.name} is exploring a recurring supply or service contract with ${bizB.name}. We believe partnering locally creates better pricing, faster delivery, and stronger community ties than sourcing from outside the region.`,
      looking_for: 'A reliable local vendor or service provider with capacity for monthly recurring orders and flexible terms.',
      location: bizA.city || 'Local Area',
      status: 'in_discussion',
      collaboration_type: 'b2b_sale',
      requirements: 'Must be able to fulfill net-30 invoicing. Preferred: local delivery or pickup available.',
    },
  ];
}

function notificationsForOwner(ownerId, bizName, blakeUserId) {
  return [
    {
      user_id: ownerId,
      type: 'follow',
      title: 'New follower',
      body: `Blake Vieyra started following ${bizName}. Say hello!`,
      link: blakeUserId ? `/listings/people/${blakeUserId}` : '/feed',
      read: false,
    },
    {
      user_id: ownerId,
      type: 'message',
      title: 'New message from Blake Vieyra',
      body: `Blake Vieyra sent you a message about ${bizName}. Tap to view and reply.`,
      link: '/messages',
      read: false,
    },
    {
      user_id: ownerId,
      type: 'collaboration',
      title: 'New partnership request',
      body: `A local business has sent a collaboration proposal to ${bizName}. Review and respond.`,
      link: '/partnerships',
      read: false,
    },
    {
      user_id: ownerId,
      type: 'connection',
      title: 'New job application received',
      body: `Blake Vieyra has applied for a position at ${bizName}. Review their application in your dashboard.`,
      link: '/dashboard/applications',
      read: false,
    },
  ];
}

function marketingCampaignsForBusiness(business, ownerId) {
  const { id: business_id, name } = business;
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + 7);

  return [
    {
      user_id: ownerId,
      business_id,
      title: `${name} — Summer Email Campaign`,
      channel: 'email',
      content: `Subject: Exciting news from ${name} this summer!\n\nHi [First Name],\n\nWe've been busy creating amazing things for you this season. From new offerings to community events, there's never been a better time to visit ${name}.\n\nThis month only: [OFFER]. Don't miss out!\n\nSee you soon,\nThe ${name} Team`,
      status: 'draft',
      scheduled_for: scheduled.toISOString(),
    },
    {
      user_id: ownerId,
      business_id,
      title: `${name} — Social Media Blast`,
      channel: 'social',
      content: `🌟 Big things are happening at ${name}!\n\nWe've got new offerings, extended hours, and a community event coming up — follow us here on BizList to stay in the loop.\n\nTag a friend who needs to know about us! 👇\n\n#LocalBusiness #Community #${name.replace(/\s+/g, '')} #SupportLocal`,
      status: 'draft',
      scheduled_for: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// 6. Conversation + messages helper
// ---------------------------------------------------------------------------
async function seedConversation(blakeId, ownerId, bizName, bizId) {
  // conversations requires participant_a < participant_b (UUID lexicographic order)
  const [pA, pB] = [blakeId, ownerId].sort();

  const { data: existing, error: fetchErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_a', pA)
    .eq('participant_b', pB)
    .maybeSingle();

  if (fetchErr) throw new Error(`fetch conversation: ${fetchErr.message}`);

  let convId;
  if (existing) {
    convId = existing.id;
    log('⏭', `  Conversation with owner of ${bizName} already exists — using existing`);
  } else {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ participant_a: pA, participant_b: pB, business_id: bizId })
      .select()
      .single();
    if (convErr) throw new Error(`insert conversation for ${bizName}: ${convErr.message}`);
    convId = conv.id;
    log('💬', `  Created conversation for ${bizName} (${convId})`);
  }

  // Check if messages already seeded
  const { data: msgs } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', convId)
    .limit(1);

  if (msgs && msgs.length > 0) {
    log('⏭', `  Messages for ${bizName} conversation already seeded — skipping`);
    return convId;
  }

  const thread = [
    {
      conversation_id: convId,
      sender_id: blakeId,
      body: `Hi! I found ${bizName} on BizList and I'm really impressed by what you've built. I'd love to learn more about your offerings and potentially explore some collaboration. Is now a good time to connect?`,
      read: true,
    },
    {
      conversation_id: convId,
      sender_id: ownerId,
      body: `Thanks so much for reaching out! We're always excited to meet people from the BizList community. Absolutely open to chatting — what specifically caught your eye? We have some new stuff coming up that might be a great fit.`,
      read: true,
    },
    {
      conversation_id: convId,
      sender_id: blakeId,
      body: `Definitely your reputation for quality and community involvement. I'd love to set up a quick call this week if your schedule allows. I'm flexible on timing — just let me know what works!`,
      read: false,
    },
  ];

  for (const msg of thread) {
    const { error } = await supabase.from('messages').insert(msg);
    if (error) throw new Error(`insert message for ${bizName}: ${error.message}`);
  }
  log('📨', `  Seeded 3-message thread for ${bizName}`);

  return convId;
}

// ---------------------------------------------------------------------------
// 7. Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🌱  Starting AllConnect seed-all.mjs\n');

  // Verify Blake exists
  const blake = await fetchProfile(BLAKE_ID);
  log('✅', `Blake profile confirmed: ${blake.display_name} (${blake.role})`);

  // Fetch all businesses
  const businesses = await fetchBusinesses();
  log('🏢', `Found ${businesses.length} businesses: ${businesses.map((b) => b.name).join(', ')}`);

  if (businesses.length === 0) {
    console.error('No businesses found. Please seed businesses first.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // For each business: posts, events, reviews, job apps, follows, notifications,
  // marketing campaigns, conversations
  // ---------------------------------------------------------------------------
  for (const biz of businesses) {
    const { id: bizId, name, owner_id: ownerId, is_hiring: isHiring } = biz;
    console.log(`\n━━━  ${name}  ━━━`);

    // Skip seeding if owner is Blake (avoid self-follow, self-review, etc. for own businesses)
    const ownerIsBlake = ownerId === BLAKE_ID;

    // 7a. Business posts
    const posts = postsForBusiness(biz, ownerId);
    for (const post of posts) {
      // Check existence by title + business_id
      const { data: existing } = await supabase
        .from('business_posts')
        .select('id')
        .eq('business_id', bizId)
        .eq('title', post.title)
        .maybeSingle();

      if (existing) {
        log('⏭', `  Post "${post.title}" already exists`);
        continue;
      }
      const inserted = await insertOne('business_posts', post);
      log('📝', `  Post: "${inserted.title}" [${inserted.post_type}]`);
    }

    // 7b. Events
    const events = eventsForBusiness(biz, ownerId);
    for (const evt of events) {
      const { data: existing } = await supabase
        .from('business_events')
        .select('id')
        .eq('business_id', bizId)
        .eq('title', evt.title)
        .maybeSingle();

      if (existing) {
        log('⏭', `  Event "${evt.title}" already exists`);
        continue;
      }
      const inserted = await insertOne('business_events', evt);
      log('📅', `  Event: "${inserted.title}"`);
    }

    // 7c. Reviews (1 per business from Blake; unique constraint)
    if (!ownerIsBlake) {
      const reviews = reviewsForBusiness(biz);
      for (const review of reviews) {
        const result = await upsertOne('business_reviews', review, 'business_id,author_id');
        log('⭐', `  Review: ${result.rating}/5 — "${result.body.slice(0, 60)}..."`);
      }
    }

    // 7d. Job applications (only if business is hiring and Blake isn't the owner)
    if (isHiring && !ownerIsBlake) {
      const apps = jobApplicationsForBusiness(biz);
      for (const app of apps) {
        const result = await upsertOne('job_applications', app, 'business_id,applicant_id');
        log('📄', `  Job application: Blake → ${name} [${result.status}]`);
      }
    } else if (!isHiring) {
      log('ℹ️', `  ${name} is not hiring — skipping job application`);
    }

    // 7e. Business follows (Blake follows each business, not own)
    if (!ownerIsBlake) {
      const followResult = await upsertOne(
        'business_follows',
        { follower_id: BLAKE_ID, business_id: bizId },
        'follower_id,business_id'
      );
      log('👥', `  Blake follows ${name}`);
    }

    // 7f. Notifications for owner
    if (!ownerIsBlake) {
      const notifs = notificationsForOwner(ownerId, name, BLAKE_ID);
      for (const notif of notifs) {
        // Check for duplicate by type + user_id + body snippet
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', ownerId)
          .eq('type', notif.type)
          .eq('title', notif.title)
          .maybeSingle();

        if (existing) {
          log('⏭', `  Notification "${notif.title}" already exists for ${name} owner`);
          continue;
        }
        const inserted = await insertOne('notifications', notif);
        log('🔔', `  Notification: [${inserted.type}] "${inserted.title}" → owner of ${name}`);
      }
    }

    // 7g. Marketing campaigns
    const campaigns = marketingCampaignsForBusiness(biz, ownerId);
    for (const campaign of campaigns) {
      const { data: existing } = await supabase
        .from('marketing_campaigns')
        .select('id')
        .eq('business_id', bizId)
        .eq('title', campaign.title)
        .maybeSingle();

      if (existing) {
        log('⏭', `  Campaign "${campaign.title}" already exists`);
        continue;
      }
      const inserted = await insertOne('marketing_campaigns', campaign);
      log('📣', `  Campaign: "${inserted.title}" [${inserted.channel}] — ${inserted.status}`);
    }

    // 7h. Conversations + messages (Blake ↔ owner, skip if owner is Blake)
    if (!ownerIsBlake) {
      await seedConversation(BLAKE_ID, ownerId, name, bizId);
    }
  }

  // ---------------------------------------------------------------------------
  // 8. B2B Collaborations between business pairs
  // ---------------------------------------------------------------------------
  console.log('\n━━━  B2B Collaborations  ━━━');

  // Pair up businesses for collaboration proposals (first two unique pairs)
  const bizPairs = [];
  for (let i = 0; i < businesses.length; i++) {
    for (let j = i + 1; j < businesses.length; j++) {
      bizPairs.push([businesses[i], businesses[j]]);
      if (bizPairs.length >= 2) break;
    }
    if (bizPairs.length >= 2) break;
  }

  for (const [bizA, bizB] of bizPairs) {
    const collabs = collaborationsForBusinessPair(bizA, bizB);
    for (const collab of collabs) {
      const { data: existing } = await supabase
        .from('collaborations')
        .select('id')
        .eq('author_id', collab.author_id)
        .eq('title', collab.title)
        .maybeSingle();

      if (existing) {
        log('⏭', `  Collaboration "${collab.title}" already exists`);
        // Seed a collaboration_comment on the existing collab as the "offer"
        await seedCollaborationOffer(existing.id, bizA.owner_id, bizB.name);
        continue;
      }
      const inserted = await insertOne('collaborations', collab);
      log('🤝', `  Collaboration: "${inserted.title}" [${inserted.collaboration_type}]`);

      // Seed collaboration_comment as a draft offer
      await seedCollaborationOffer(inserted.id, bizA.owner_id, bizB.name);
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Summary
  // ---------------------------------------------------------------------------
  console.log('\n✅  seed-all.mjs complete!\n');
}

async function seedCollaborationOffer(collaborationId, authorId, partnerName) {
  const { data: existing } = await supabase
    .from('collaboration_comments')
    .select('id')
    .eq('collaboration_id', collaborationId)
    .eq('author_id', authorId)
    .maybeSingle();

  if (existing) {
    log('⏭', `  Collaboration offer/comment already exists`);
    return;
  }

  const inserted = await insertOne('collaboration_comments', {
    collaboration_id: collaborationId,
    author_id: authorId,
    body: `Hi ${partnerName} team — we've been following your work on BizList and think there's a real opportunity here. We'd love to move this conversation forward. Would you be open to a 30-minute call to discuss terms? We're flexible on timing and structure. Looking forward to building something together!`,
    attachment_urls: [],
  });
  log('📋', `  Collaboration offer/comment seeded (${inserted.id})`);
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
