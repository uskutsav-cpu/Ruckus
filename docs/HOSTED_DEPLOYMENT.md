# Hosted deployment

This is the operational runbook for the hosted Ruckus deployment. It records what
is live, and the exact remaining steps that require an account owner.

## Web — Vercel (live)

| Field         | Value                                                  |
| ------------- | ------------------------------------------------------ |
| Project       | `ruckus` (scope `uskutsav-cpus-projects`)              |
| Production    | https://ruckus-iota.vercel.app                         |
| Output mode   | Expo web `static` (one HTML document per route)        |
| Build command | `npx expo export --platform web --output-dir dist/web` |
| Output dir    | `dist/web`                                             |

### Why static output

Expo's default single-page output never applies `app/+html.tsx`, so the site
shipped with no description, share card, or canonical URL. Static output renders
a document per known route, which is what makes that metadata reachable by
crawlers and social scrapers.

### Routing rules that matter

`cleanUrls` is enabled so `/public/terms` resolves `public/terms.html`. That also
makes the extensionless path canonical, which has a consequence that is easy to
get wrong: **a rewrite whose destination ends in `.html` is 308-redirected and the
rewrite fails.** Dynamic share routes therefore point at the bracket file without
its extension, for example:

```json
{ "source": "/public/event/:slug", "destination": "/public/event/[slug]" }
```

Anything still unmatched falls back to Expo's generated `/+not-found` document.

When adding a new dynamic route, add a matching rewrite in `vercel.json` and
confirm the deployed path returns 200 before merging.

### Security headers

`vercel.json` sets a real CSP rather than a permissive one: `default-src 'self'`,
`script-src 'self'` (the export has no inline scripts), `style-src` allows inline
because React Native Web injects styles at runtime, and `connect-src` allows only
self plus the Supabase REST and Realtime origins. Also set: `frame-ancestors
'none'`, `X-Frame-Options: DENY`, `nosniff`, HSTS with preload, a restrictive
`Permissions-Policy`, and `Cross-Origin-Opener-Policy: same-origin`.

Hashed assets under `/_expo/static` and `/assets` are served immutable for a
year; `index.html` is never cached.

### Environment variables

Set per target in Vercel (Production, Preview, Development). Only
`EXPO_PUBLIC_*` values belong here — never a service-role key or any secret.

| Variable                              | Current value |
| ------------------------------------- | ------------- |
| `EXPO_PUBLIC_APP_ENV`                 | `development` |
| `EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN` | `example.edu` |

`EXPO_PUBLIC_APP_ENV=development` is what keeps the deployment in **demo mode**.
`src/lib/env.ts` fails closed: in `staging` or `production` the app refuses to
start unless both Supabase values are present. The site is therefore fully
browsable today on demo data and cannot silently point at a half-configured
backend.

## Backend — hosted Supabase (not yet provisioned)

The Supabase CLI is **not authenticated** in this environment and the repository
is not linked to a hosted project. Everything below is prepared and unblocked by
a single owner action.

### Step 1 — authenticate (owner action)

Create a personal access token at
https://supabase.com/dashboard/account/tokens, then:

```bash
supabase login --token <YOUR_ACCESS_TOKEN>
```

Or export it for a single session:

```bash
export SUPABASE_ACCESS_TOKEN=<YOUR_ACCESS_TOKEN>
```

Never commit this token. It is not an `EXPO_PUBLIC_*` value.

### Step 2 — link and push the schema

```bash
supabase projects list
supabase link --project-ref <PROJECT_REF>
supabase db push
```

`supabase/seed.sql` is a local development seed and must **not** reach the hosted
project. `supabase db push` applies migrations only; do not run `db reset`
against a linked hosted project.

### Step 3 — deploy Edge Functions

```bash
supabase functions deploy
```

Twelve functions are expected. `campus-announcement-publisher`,
`analytics-maintenance`, `recommendation-maintenance`, `notification-sweep`,
`process-push-receipts`, and `purge-deleted-accounts` are internal and
secret-authenticated: they validate `CRON_SECRET` and must not have JWT
verification disabled globally.

### Step 4 — secrets

```bash
supabase secrets set CHECKIN_TOKEN_PEPPER=<random>
supabase secrets set CRON_SECRET=<independent random>
supabase secrets set PARTNERSHIP_RATE_LIMIT_PEPPER=<independent random>
```

Generate each independently, for example `openssl rand -hex 32`.

### Step 5 — connect the web deployment

Once the project exists, set in Vercel (Production) and redeploy:

```bash
vercel env add EXPO_PUBLIC_SUPABASE_URL production
vercel env add EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env add EXPO_PUBLIC_SUPABASE_PROJECT_REF production
vercel env rm EXPO_PUBLIC_APP_ENV production   # then re-add as "production"
vercel deploy --prod
```

`EXPO_PUBLIC_SUPABASE_URL` must be exactly `https://<PROJECT_REF>.supabase.co` or
the environment check rejects it.

### Step 6 — Auth redirect URLs

In the Supabase dashboard set Site URL to `https://ruckus-iota.vercel.app` and add
these exact redirect URLs:

```text
https://ruckus-iota.vercel.app
https://ruckus-iota.vercel.app/auth/callback
https://ruckus-iota.vercel.app/verify-email
https://ruckus-iota.vercel.app/account-deletion-confirmed
ruckus://auth/callback
ruckus://verify-email
```

Prefer exact URLs over wildcards in production.

### Step 7 — SMTP (blocked on a provider account)

No SMTP credentials exist. Until a verified sender is configured, Supabase's
built-in email is rate-limited and unsuitable for production. Configure a verified
sender, From, and Reply-To in the dashboard, then send a real test message and
confirm the auth link is not rewritten by click tracking. **Do not treat email as
working until a real message has been received.**

### Step 8 — scheduled jobs

Schedule via Supabase Cron, each POSTing to its function with the `CRON_SECRET`
header. Every job is written to be idempotent, so a retry cannot double-process.

| Job                             | Suggested cadence |
| ------------------------------- | ----------------- |
| `campus-announcement-publisher` | every 5 minutes   |
| `notification-sweep`            | every minute      |
| `process-push-receipts`         | every 15 minutes  |
| `analytics-maintenance`         | hourly            |
| `recommendation-maintenance`    | hourly            |
| `purge-deleted-accounts`        | daily             |

## Mobile — EAS (not authenticated)

```bash
eas login
eas init
eas build --platform android --profile preview
```

`eas whoami` currently reports "Not logged in". Signed production builds
additionally require Apple Developer and Google Play credentials, which are
account-owner actions and cannot be completed from this environment.

## What is genuinely blocked

| Item                    | Blocker                  |
| ----------------------- | ------------------------ |
| Hosted Supabase project | Supabase access token    |
| Production email        | SMTP provider account    |
| EAS builds              | Expo account login       |
| Signed iOS build        | Apple Developer account  |
| Signed Android build    | Google Play account      |
| Legal approval          | Qualified counsel review |
