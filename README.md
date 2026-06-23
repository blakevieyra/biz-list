# AllConnect

A local business and organization community platform — directory, forum, collaboration, messaging, and profiles.

## Features

- **Business directory** — search and filter by hiring, customers, advice, partnerships
- **Auth** — email/password sign up and sign in (Supabase)
- **Profiles** — multi-step wizard for businesses, organizations, and customers
- **Follow & connect** — follow businesses, request connections, get notified
- **Forum** — posts, comments, categories including legal lessons and local topics
- **Collaborate** — joint venture ideas board
- **Messaging** — direct messages between users and business owners
- **Notifications** — follows, connections, comments, and messages

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local` and add your project URL and anon key
3. In Supabase Dashboard → **SQL Editor**, run the full contents of `supabase/schema.sql`
4. In Supabase Dashboard → **Authentication** → **Providers**, enable Email
5. (Optional) Disable email confirmation for local dev under Auth settings

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo mode

Without Supabase env vars, the app runs in **demo mode** with sample data. Auth, messaging, and persistence require Supabase.

## Project structure

```
src/
  app/              # Pages (directory, forum, auth, messages, notifications)
  components/       # UI components
  lib/
    actions/        # Server actions (auth, social)
    data/           # Data access (Supabase + mock fallback)
    supabase/       # Supabase clients and middleware
supabase/
  schema.sql        # Database schema + RLS policies
```

## Tech stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Supabase (Auth + PostgreSQL)
- TypeScript
