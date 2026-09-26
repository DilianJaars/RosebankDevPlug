# RosebankDevPlug — setup guide

This is a real Next.js 14 + Supabase app. Every login, rating, upload and
admin action reads/writes an actual Postgres database — there is no mock
data and nothing runs only in `localStorage` except your cookie-consent
choice.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's up, go to **SQL Editor** → paste the entire contents of
   `supabase/schema.sql` → Run. This creates every table, every Row Level
   Security policy, and the triggers that back the app.
3. Go to **Storage** → Create a new bucket called `papers` → set it to
   **Private** (not public). The storage policies in `schema.sql` already
   grant the right access on top of that.
4. Go to **Project Settings → API** → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**keep this secret** —
     it bypasses every RLS policy; it's only ever used server-side in
     `app/api/admin-login/route.ts`)

Copy `.env.example` to `.env.local` and fill in those three values, plus
`NEXT_PUBLIC_SITE_URL` (use `http://localhost:3000` for local dev).

## 2. Enable real Google Sign-In

Supabase doesn't ship a working Google login out of the box — it needs a
real OAuth client from Google:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create
   a project (or use an existing one) → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID** → Application type: **Web
   application**.
3. Under **Authorized redirect URIs**, add your Supabase callback URL —
   find the exact one in Supabase: **Authentication → Providers → Google**
   (it looks like `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`).
4. Copy the generated **Client ID** and **Client Secret**.
5. In Supabase: **Authentication → Providers → Google** → toggle it on →
   paste the Client ID and Secret → Save.
6. In Supabase: **Authentication → URL Configuration**, add your site's
   real URL (and `http://localhost:3000` for local testing) to **Redirect
   URLs**.

That's it — the "Continue with Google" button in this app
(`app/login/page.tsx`) is already wired to `supabase.auth.signInWithOAuth`
and will work as soon as the provider is configured above.

## 3. Create your first admin account

There's deliberately no self-serve admin sign-up.

1. Sign up for a normal account through the site's `/login` page (email or
   Google — either works).
2. In Supabase: **Table Editor → profiles** → find your row → change
   `role` from `student` to `admin` → Save.
3. Go to `/admin/login` on your site and sign in with that account's
   password (Google-only accounts need a password set too — add one via
   **Authentication → Users → your user → Reset password**, or use
   email/password sign-up for the admin account specifically).
4. Because no 2FA factor exists yet, you'll be sent to `/admin/setup-mfa`
   to scan a QR code with Google Authenticator / Authy and confirm a code.
   After that, every future admin sign-in requires password **and** that
   6-digit code.

## 4. Payments (Payfast)

Not wired up in this build — the Billing tab and "Pay to Unlock" buttons
show what the flow will look like, but don't process real money. To go
live: create a Payfast merchant account, and add a server route that (a)
starts a Payfast checkout session and (b) verifies Payfast's ITN webhook
server-side before marking a paper unlocked for that user. Happy to build
that route when you're ready.

## 5. Run it

```bash
npm install
npm run dev
```

Deploy to Vercel the same way as before — connect the GitHub repo, set the
four env vars above in the Vercel project settings, deploy. Framework
preset this time is auto-detected as **Next.js**, so leave build settings
on their defaults.

## What's genuinely secure here, and what to know

- **Passwords**: bcrypt-hashed by Supabase Auth server-side. This app
  never sees or stores a plaintext or hashed password.
- **Admin login lockout**: enforced in Postgres via
  `admin_login_attempts`, a table with **zero** RLS policies — meaning no
  client, not even a signed-in user, can read or write it directly. Only
  `app/api/admin-login/route.ts`, running server-side with the
  service-role key, can touch it. Clearing cookies or `localStorage`
  cannot reset your lockout.
- **Admin 2FA**: real TOTP via Supabase Auth's built-in MFA. The admin
  panel is blocked by `middleware.ts` unless your session is at AAL2
  (2FA verified this session) — checked fresh on every request, not just
  at login.
- **Every table's access rules** live in `supabase/schema.sql` as Row
  Level Security policies, enforced by Postgres itself — not by any
  `if (user.role === 'admin')` check in the React code, which could be
  bypassed by editing the client. A user can only ever read/write rows
  they're allowed to; the app just displays what the database is willing
  to hand back.
- **No fake data anywhere.** Papers, ratings, and stats all come straight
  from the database and start at zero — the homepage and ratings page
  show an honest "nothing here yet" state until real students upload and
  rate things.
