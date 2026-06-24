#!/usr/bin/env node
/**
 * Seeds demo businesses, customers, and interactions into Supabase.
 * Idempotent — skips if demo accounts already exist unless --force is passed.
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DATABASE_URL (or SUPABASE_DB_PASSWORD)
 *
 * Usage: npm run db:seed
 *        npm run db:seed -- --force
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const DEMO_PASSWORD = "DemoConnect2026!";
const DEMO_EMAIL_SUFFIX = "@demo.allconnect.app";

const ZIP_BY_CITY = {
  Austin: "78701",
  "Round Rock": "78664",
  "Cedar Park": "78613",
};

const CUSTOMER_INDUSTRY_INTERESTS = {
  alex: ["Marketing & Print", "Entertainment & Events"],
  jordan: ["Food & Beverage", "Retail & Community"],
  sam: ["Marketing & Print", "Entertainment & Events"],
  priya: ["Entertainment & Events", "Food & Beverage"],
};

const DEMO_IMAGES = {
  bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
  bakery2: "https://images.unsplash.com/photo-1549931319-a545dcf247de?w=800&q=80",
  legal: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80",
  retail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
  fitness: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  print: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
};

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const force = process.argv.includes("--force");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
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

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return url.replace(/^https?:\/\//, "").split(".")[0];
}

function buildConnectionUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = getProjectRef();
  if (!password || !ref) return null;
  const region = process.env.SUPABASE_DB_REGION || "us-west-2";
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}

const USERS = [
  {
    key: "maria",
    email: `maria${DEMO_EMAIL_SUFFIX}`,
    role: "business",
    displayName: "Maria Chen",
    bio: "Owner of Riverbend Bakery — sourdough, pastries, and community events.",
    city: "Austin",
    state: "TX",
    planTier: "free",
    forumInterests: [],
    interestTags: [],
    headline: "",
    skills: [],
    isSeekingWork: false,
  },
  {
    key: "james",
    email: `james${DEMO_EMAIL_SUFFIX}`,
    role: "business",
    displayName: "James Okonkwo",
    bio: "Small-business attorney focused on contracts, leases, and compliance.",
    city: "Austin",
    state: "TX",
    planTier: "free",
    forumInterests: ["legal_lessons"],
    interestTags: [],
    headline: "",
    skills: [],
    isSeekingWork: false,
  },
  {
    key: "makers",
    email: `makers${DEMO_EMAIL_SUFFIX}`,
    role: "organization",
    displayName: "Local Makers Co-op",
    bio: "Nonprofit supporting artisans and pop-up retail across Central Texas.",
    city: "Round Rock",
    state: "TX",
    planTier: "free",
    forumInterests: ["partnerships", "local"],
    interestTags: [],
    headline: "",
    skills: [],
    isSeekingWork: false,
  },
  {
    key: "alex",
    email: `alex${DEMO_EMAIL_SUFFIX}`,
    role: "customer",
    displayName: "Alex Rivera",
    bio: "Freelance marketer helping local shops grow online and in the neighborhood.",
    city: "Austin",
    state: "TX",
    planTier: "free",
    forumInterests: ["hiring", "local"],
    interestTags: ["marketing", "events"],
    headline: "Open to local marketing and content projects",
    skills: ["Social media", "Content writing", "Email campaigns"],
    isSeekingWork: true,
  },
  {
    key: "jordan",
    email: `jordan${DEMO_EMAIL_SUFFIX}`,
    role: "customer",
    displayName: "Jordan Lee",
    bio: "Community member who loves supporting local restaurants and pop-ups.",
    city: "Round Rock",
    state: "TX",
    planTier: "free",
    forumInterests: ["local"],
    interestTags: ["food", "local"],
    headline: "",
    skills: [],
    isSeekingWork: false,
  },
  {
    key: "sam",
    email: `sam${DEMO_EMAIL_SUFFIX}`,
    role: "customer",
    displayName: "Sam Nguyen",
    bio: "Product photographer and brand storyteller for local shops and makers.",
    city: "Austin",
    state: "TX",
    planTier: "free",
    forumInterests: ["partnerships", "local"],
    interestTags: ["photography", "branding"],
    headline: "Available for local product & storefront shoots",
    skills: ["Product photography", "Lightroom", "Brand storytelling"],
    isSeekingWork: true,
  },
  {
    key: "priya",
    email: `priya${DEMO_EMAIL_SUFFIX}`,
    role: "customer",
    displayName: "Priya Patel",
    bio: "Event planner specializing in small-business launch parties and pop-ups.",
    city: "Cedar Park",
    state: "TX",
    planTier: "free",
    forumInterests: ["partnerships", "hiring"],
    interestTags: ["events", "hospitality"],
    headline: "Planning pop-ups and grand openings",
    skills: ["Event planning", "Vendor coordination", "Social promotion"],
    isSeekingWork: true,
  },
  {
    key: "diego",
    email: `diego${DEMO_EMAIL_SUFFIX}`,
    role: "business",
    displayName: "Diego Morales",
    bio: "Founder of Hill Country Fitness — group classes and corporate wellness.",
    city: "Cedar Park",
    state: "TX",
    planTier: "pro",
    forumInterests: ["local", "partnerships"],
    interestTags: [],
    headline: "",
    skills: [],
    isSeekingWork: false,
  },
  {
    key: "elena",
    email: `elena${DEMO_EMAIL_SUFFIX}`,
    role: "business",
    displayName: "Elena Vasquez",
    bio: "Owner of Cedar Park Print Co. — signage and marketing materials for local businesses.",
    city: "Cedar Park",
    state: "TX",
    planTier: "free",
    forumInterests: ["local"],
    interestTags: [],
    headline: "",
    skills: [],
    isSeekingWork: false,
  },
];

const BUSINESSES = [
  {
    ownerKey: "maria",
    name: "Riverbend Bakery",
    tagline: "Fresh bread, stronger neighborhoods",
    description:
      "Neighborhood bakery offering wholesale loaves to cafés and catering for local events.",
    category: "Food & Beverage",
    website: "https://riverbendbakery.example",
    phone: "(512) 555-0101",
    hours: "Tue–Sun 7am–3pm",
    importantInfo: "Wholesale orders need 48hr notice.",
    isHiring: true,
    services: [
      { name: "Wholesale loaves", description: "Sourdough and country loaves for cafés" },
      { name: "Event catering", description: "Pastry trays for offices and events" },
    ],
    mediaUrls: [DEMO_IMAGES.bakery, DEMO_IMAGES.bakery2],
    intents: ["seeking_customers", "open_to_partnerships", "hiring"],
  },
  {
    ownerKey: "james",
    name: "Greenline Legal",
    tagline: "Practical legal guidance for growing businesses",
    description: "Flat-fee contract reviews, lease negotiations, and compliance checklists.",
    category: "Professional Services",
    phone: "(512) 555-0202",
    hours: "Mon–Fri 9am–5pm",
    importantInfo: "Free 15-minute intro call for new clients.",
    isHiring: false,
    services: [
      { name: "Contract review", description: "Flat-fee vendor and client agreements" },
      { name: "Lease review", description: "Commercial lease negotiation support" },
    ],
    mediaUrls: [DEMO_IMAGES.legal],
    intents: ["seeking_customers", "seeking_advice"],
  },
  {
    ownerKey: "makers",
    name: "Local Makers Co-op",
    tagline: "Shared retail for independent creators",
    description: "Rotating storefront space, shared marketing, and vendor events.",
    category: "Retail & Community",
    phone: "(512) 555-0303",
    hours: "Wed–Sat 10am–6pm",
    importantInfo: "Vendor applications reviewed monthly.",
    isHiring: true,
    services: [
      { name: "Pop-up retail", description: "Short-term shelf space for makers" },
      { name: "Community events", description: "Markets and maker showcases" },
    ],
    mediaUrls: [DEMO_IMAGES.retail],
    intents: ["seeking_customers", "open_to_partnerships", "hiring"],
  },
  {
    ownerKey: "diego",
    name: "Hill Country Fitness",
    tagline: "Stronger teams start local",
    description: "Boutique gym with small-group training and corporate wellness packages.",
    category: "Health & Wellness",
    website: "https://hillcountryfit.demo",
    phone: "(512) 555-0404",
    hours: "Mon–Sat 5am–9pm",
    importantInfo: "First class free for new members.",
    isHiring: true,
    services: [
      { name: "Corporate wellness", description: "On-site stretch sessions", price: "From $199/mo" },
      { name: "Small-group training", description: "Strength and conditioning", price: "$149/mo" },
    ],
    mediaUrls: [DEMO_IMAGES.fitness],
    intents: ["seeking_customers", "open_to_partnerships", "hiring"],
  },
  {
    ownerKey: "elena",
    name: "Cedar Park Print Co.",
    tagline: "Print that pulls people in",
    description: "Menus, yard signs, event banners, and branded merch for local businesses.",
    category: "Marketing & Print",
    phone: "(512) 555-0505",
    hours: "Mon–Fri 8am–6pm",
    importantInfo: "Rush jobs available with 24hr notice.",
    isHiring: false,
    services: [
      { name: "Menu & signage printing", description: "Restaurant and retail signage", price: "From $89" },
      { name: "Event banners", description: "Vinyl banners for markets", price: "From $120" },
    ],
    mediaUrls: [DEMO_IMAGES.print],
    intents: ["seeking_customers", "open_to_partnerships"],
  },
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = buildConnectionUrl();

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  if (!dbUrl) {
    console.error("Missing DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const existing = await client.query(
      "select count(*)::int as n from public.profiles where email like $1",
      [`%${DEMO_EMAIL_SUFFIX}`],
    );
    if (existing.rows[0].n > 0 && !force) {
      console.log(`Demo data already exists (${existing.rows[0].n} accounts). Run with --force to re-seed.`);
      return;
    }

    if (force && existing.rows[0].n > 0) {
      console.log("Removing existing demo data...");
      await client.query(
        `delete from auth.users where email like $1`,
        [`%${DEMO_EMAIL_SUFFIX}`],
      );
    }

    console.log("Creating demo users...");
    const ids = {};

    for (const user of USERS) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: user.displayName },
      });
      if (error) throw new Error(`Auth create ${user.email}: ${error.message}`);
      ids[user.key] = data.user.id;

      const { error: profileError } = await supabase.from("profiles").update({
        display_name: user.displayName,
        email: user.email,
        role: user.role,
        bio: user.bio,
        city: user.city,
        state: user.state,
        zip_code: ZIP_BY_CITY[user.city] ?? "",
        forum_interests: user.forumInterests,
        interest_tags: user.interestTags,
        industry_interests: CUSTOMER_INDUSTRY_INTERESTS[user.key] ?? [],
        headline: user.headline,
        skills: user.skills,
        is_seeking_work: user.isSeekingWork,
        plan_tier: user.planTier,
      }).eq("id", ids[user.key]);

      if (profileError) throw new Error(`Profile ${user.email}: ${profileError.message}`);
      console.log(`  ✓ ${user.displayName}`);
    }

    console.log("Creating businesses...");
    const businessIds = {};
    for (const biz of BUSINESSES) {
      const ownerId = ids[biz.ownerKey];
      const { rows } = await client.query(
        `insert into public.businesses (
          owner_id, name, tagline, description, category, city, state, zip_code,
          website, phone, hours, important_info, is_hiring, services, media_urls, intents
        ) values (
          $1, $2, $3, $4, $5,
          (select city from public.profiles where id = $1),
          (select state from public.profiles where id = $1),
          (select zip_code from public.profiles where id = $1),
          $6, $7, $8, $9, $10, $11::jsonb, $12, $13::business_intent[]
        )
        returning id`,
        [
          ownerId,
          biz.name,
          biz.tagline,
          biz.description,
          biz.category,
          biz.website ?? null,
          biz.phone ?? "",
          biz.hours ?? "",
          biz.importantInfo ?? "",
          biz.isHiring ?? false,
          JSON.stringify(biz.services ?? []),
          biz.mediaUrls ?? [],
          biz.intents ?? [],
        ],
      );
      businessIds[biz.name] = rows[0].id;
      console.log(`  ✓ ${biz.name}`);
    }

    console.log("Seeding interactions...");

    const riverbend = businessIds["Riverbend Bakery"];
    const greenline = businessIds["Greenline Legal"];
    const makers = businessIds["Local Makers Co-op"];
    const fitness = businessIds["Hill Country Fitness"];
    const printCo = businessIds["Cedar Park Print Co."];

    const follows = [
      [riverbend, ids.alex],
      [riverbend, ids.jordan],
      [riverbend, ids.james],
      [greenline, ids.jordan],
      [greenline, ids.priya],
      [makers, ids.alex],
      [makers, ids.sam],
      [fitness, ids.alex],
      [printCo, ids.sam],
      [printCo, ids.maria],
    ];
    for (const [businessId, followerId] of follows) {
      await client.query(
        `insert into public.business_follows (business_id, follower_id) values ($1, $2) on conflict do nothing`,
        [businessId, followerId],
      );
    }

    const likes = [
      [riverbend, ids.alex],
      [riverbend, ids.jordan],
      [makers, ids.sam],
      [fitness, ids.priya],
      [printCo, ids.maria],
    ];
    for (const [businessId, userIdVal] of likes) {
      await client.query(
        `insert into public.business_likes (business_id, user_id) values ($1, $2) on conflict do nothing`,
        [businessId, userIdVal],
      );
    }

    await client.query(
      `update public.businesses set like_count = (
        select count(*) from public.business_likes bl where bl.business_id = businesses.id
      ) where name = any($1::text[])`,
      [Object.keys(businessIds)],
    );

    const reviews = [
      [riverbend, ids.alex, 5, "Best sourdough in the neighborhood. Maria catered pastries for our shop launch."],
      [riverbend, ids.jordan, 5, "Friendly team and consistent quality. The Saturday drop is worth the trip."],
      [greenline, ids.priya, 5, "James reviewed our pop-up vendor agreement in plain English."],
      [makers, ids.sam, 4, "Great community energy during market days."],
      [printCo, ids.maria, 5, "Elena turned around menu boards in 48 hours before our launch."],
    ];
    for (const [businessId, authorId, rating, body] of reviews) {
      await client.query(
        `insert into public.business_reviews (business_id, author_id, rating, body)
         values ($1, $2, $3, $4) on conflict (business_id, author_id) do update set rating = excluded.rating, body = excluded.body`,
        [businessId, authorId, rating, body],
      );
    }

    const posts = [
      [riverbend, ids.maria, "New weekend sourdough drop — Saturdays at 8am", "Starting this Saturday we're doing a limited sourdough drop at the shop.", [DEMO_IMAGES.bakery], 42, true],
      [riverbend, ids.maria, "Now hiring a part-time pastry assistant", "Looking for someone with early-morning availability Tue–Sat.", [], 28, false],
      [makers, ids.makers, "June maker market — vendor spots open", "Ten spots left for our June community market.", [DEMO_IMAGES.retail], 35, true],
      [fitness, ids.diego, "Free corporate stretch sessions this month", "Piloting 20-minute desk-break mobility sessions for local offices.", [DEMO_IMAGES.fitness], 19, false],
      [printCo, ids.elena, "Grand opening banner bundle — 15% off in May", "Bundled yard signs and window clings for local launches.", [DEMO_IMAGES.print], 24, false],
      [greenline, ids.james, "Summer lease review special for retail pop-ups", "Flat-fee review available through June.", [DEMO_IMAGES.legal], 15, false],
    ];

    const postIds = [];
    for (const [businessId, authorId, title, body, media, score, trending] of posts) {
      const { rows } = await client.query(
        `insert into public.business_posts (business_id, author_id, title, body, media_urls, engagement_score, is_trending)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [businessId, authorId, title, body, media, score, trending],
      );
      postIds.push(rows[0].id);
    }

    await client.query(
      `insert into public.business_post_comments (post_id, author_id, body)
       select $1, $2, $3 where not exists (
         select 1 from public.business_post_comments where post_id = $1 and author_id = $2 and body = $3
       )`,
      [postIds[0], ids.alex, "Can't wait — will you post flavors here each week?"],
    );
    await client.query(
      `insert into public.business_post_comments (post_id, author_id, body)
       select $1, $2, $3 where not exists (
         select 1 from public.business_post_comments where post_id = $1 and author_id = $2 and body = $3
       )`,
      [postIds[0], ids.maria, "Yes! We post the lineup every Thursday here and on our listing."],
    );
    await client.query(
      `insert into public.business_post_comments (post_id, author_id, body)
       select $1, $2, $3 where not exists (
         select 1 from public.business_post_comments where post_id = $1 and author_id = $2 and body = $3
       )`,
      [postIds[4], ids.sam, "Perfect timing — we need banners for a June pop-up."],
    );
    await client.query(
      `insert into public.business_post_comments (post_id, author_id, body)
       select $1, $2, $3 where not exists (
         select 1 from public.business_post_comments where post_id = $1 and author_id = $2 and body = $3
       )`,
      [postIds[4], ids.elena, "Sam — message us your dimensions and we'll get you a quote today."],
    );

    await client.query(
      `insert into public.business_connections (business_id, requester_id, status)
       values ($1, $2, 'pending'::connection_status)
       on conflict do nothing`,
      [printCo, ids.maria],
    );

    const convoPairs = [
      [ids.alex, ids.maria, riverbend],
      [ids.sam, ids.elena, printCo],
      [ids.priya, ids.james, greenline],
    ];
    for (const [a, b, businessId] of convoPairs) {
      const [participantA, participantB] = a < b ? [a, b] : [b, a];
      const { rows } = await client.query(
        `insert into public.conversations (participant_a, participant_b, business_id)
         values ($1, $2, $3)
         on conflict do nothing
         returning id`,
        [participantA, participantB, businessId],
      );
      let conversationId = rows[0]?.id;
      if (!conversationId) {
        const found = await client.query(
          `select id from public.conversations where participant_a = $1 and participant_b = $2`,
          [participantA, participantB],
        );
        conversationId = found.rows[0]?.id;
      }
      if (!conversationId) continue;

      const messages = a === ids.alex
        ? [
            [ids.alex, "Hi Maria — loved the sourdough drop post. Do you cater small office events?"],
            [ids.maria, "Hi Alex! Yes — pastry trays for 10–30 people. What date are you thinking?"],
          ]
        : a === ids.sam
          ? [
              [ids.sam, "Elena, we need banners and menu boards for a June pop-up. Can you quote rush turnaround?"],
              [ids.elena, "Absolutely — send dimensions and I'll reply with a bundle price today."],
            ]
          : [
              [ids.priya, "James, quick question on a short-term retail lease for a holiday pop-up."],
              [ids.james, "Happy to help — send the draft lease and I'll flag the top three risks."],
            ];

      for (const [senderId, body] of messages) {
        await client.query(
          `insert into public.messages (conversation_id, sender_id, body, read)
           select $1, $2, $3, false
           where not exists (
             select 1 from public.messages where conversation_id = $1 and sender_id = $2 and body = $3
           )`,
          [conversationId, senderId, body],
        );
      }
    }

    const forumPosts = [
      [ids.james, "legal_lessons", "Lesson learned: always get vendor agreements in writing", "Even informal partnerships need a one-page agreement covering dates, fees, and cancellation."],
      [ids.maria, "local", "Best farmers markets for new food vendors in Austin?", "Which local markets have been welcoming to bakeries?"],
      [ids.alex, "hiring", "Looking for part-time social help for a food truck", "Weekend food truck needs someone local for Instagram stories and posting."],
      [ids.sam, "partnerships", "Free mini-shoots for 3 local shops this month", "Offering a free 1-hour product shoot to three bakeries or cafés."],
    ];
    for (const [authorId, category, title, body] of forumPosts) {
      await client.query(
        `insert into public.forum_posts (author_id, category, title, body)
         select $1, $2::forum_category, $3, $4
         where not exists (select 1 from public.forum_posts where author_id = $1 and title = $3)`,
        [authorId, category, title, body],
      );
    }

    const collabs = [
      [ids.maria, riverbend, "Bakery + coffee shop co-branded breakfast box", "Partner with a local roaster to sell weekend breakfast boxes.", "Coffee shop within 10 miles of Austin", "Austin, TX"],
      [ids.makers, makers, "Shared loyalty program for indie retailers", "Pilot a punch-card rewards program across small shops.", "Retail owners interested in cross-promotion", "Round Rock / Georgetown, TX"],
      [ids.diego, fitness, "Office wellness + bakery breakfast pop-up", "Partner with a bakery for post-class recovery snacks.", "Food business near Cedar Park", "Cedar Park, TX"],
    ];
    for (const [authorId, businessId, title, summary, lookingFor, location] of collabs) {
      await client.query(
        `insert into public.collaborations (author_id, business_id, title, summary, looking_for, location, status)
         select $1, $2, $3, $4, $5, $6, 'open'::collaboration_status
         where not exists (select 1 from public.collaborations where author_id = $1 and title = $3)`,
        [authorId, businessId, title, summary, lookingFor, location],
      );
    }

    console.log("\n✅ Demo seed complete.\n");
    console.log("Demo login (any account):");
    for (const user of USERS) {
      console.log(`  ${user.email} / ${DEMO_PASSWORD}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
