# AllConnect — Vercel + Supabase setup

Follow these steps once. After that, every `git push` to `main` redeploys on Vercel automatically.

---

## Part 1: Supabase (database + auth)

### 1. Log in to Supabase CLI

In a terminal (this opens your browser once):

```bash
npx supabase login
```

### 2. Create the project

```bash
npm run supabase:init
```

Or manually:

```bash
npx supabase projects create all-connect --org-id YOUR_ORG_ID --db-password "CHOOSE_A_STRONG_PASSWORD" --region us-west-1
```

List orgs: `npx supabase orgs list`

### 3. Link this repo to the Supabase project

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Project ref is in Supabase Dashboard → Project Settings → General.

### 4. Push the database schema

```bash
npm run supabase:push
```

This runs `supabase/schema.sql` against your remote database.

### 5. Get API keys

Supabase Dashboard → **Project Settings** → **API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 6. Configure auth redirect URLs

Supabase Dashboard → **Authentication** → **URL Configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://all-connect-seven.vercel.app` |
| Redirect URLs | `https://all-connect-seven.vercel.app/auth/callback` |
| | `https://*.vercel.app/auth/callback` (preview deploys) |
| | `http://localhost:3000/auth/callback` (local dev) |

Under **Providers**, ensure **Email** is enabled.

---

## Part 2: Vercel (hosting)

### Option A — GitHub integration (recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import **blakevieyra/all-connect**
3. Add environment variables:

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase API settings |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase API settings |

4. Deploy

### Option B — CLI (already linked if you ran deploy)

```bash
# Add env vars (run twice, once per variable)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Redeploy with env vars
npx vercel --prod
```

### Local development

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and anon key
npm run dev
```

---

## Verify

1. Open your Vercel URL — header should **not** say "Demo mode"
2. Sign up at `/auth/signup`
3. Complete profile at `/profile/create`
4. Post in forum, follow a business, send a message

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Demo mode" in header | Supabase env vars missing on Vercel — add and redeploy |
| Auth redirect error | Add Vercel URL to Supabase redirect URLs |
| RLS / permission errors | Re-run `npm run supabase:push` |
| Email confirmation blocks signup | Disable confirmations in Supabase Auth settings (dev) |
