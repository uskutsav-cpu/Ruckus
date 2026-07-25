# Ruckus

**Swipe into something.**

Ruckus helps verified college students swipe into spontaneous group activities, meet
safely in public places, and earn XP for showing up. The backend forms overlap-safe
crews, gates a private lobby and Realtime chat, reveals an approved public venue after
confirmation, verifies attendance with rotating QR codes, and awards XP from an
append-only server ledger.

This is explicitly a group social activity app. It has no dating, one-to-one matching,
direct messages, payments, user-created activities, AI recommendations, or live and
background location collection.

## Stack

- Expo SDK 57, React Native 0.86, React 19.2, strict TypeScript, Expo Router
- Supabase Auth, Postgres, RLS, Storage, Realtime, and authenticated Edge Functions
- TanStack Query with offline awareness and persisted swipe intent
- Expo Camera, Notifications, Image, Image Picker, Secure Store, Haptics, and EAS
- Vitest, pgTAP, ESLint, Prettier, Supabase CLI, and GitHub Actions

Node.js 22.13 or newer is required.

## Run the app

```sh
npm install
cp .env.example .env
npm run db:start
npm run db:reset
npx supabase status -o env
```

Copy the local API URL and publishable/anon key into `.env`, then run a native
development build:

```sh
npm run ios
# or
npm run android
```

`npm run start:go` supports UI exploration where the native module set permits, but
remote Android push notification acceptance requires a development build. Without
Supabase variables, the app offers an explicit local demo flow with activity, group,
chat, QR, profile, and leaderboard data.

The seed password is `CampusClash1!`. Local-only accounts are:

- `demo1@example.edu` through `demo6@example.edu`
- `host@example.edu`
- `admin@example.edu`

The seeded campus uses `example.edu` and configurable database values of minimum 4,
target 6, and maximum 8 group members.

## Verify

```sh
npm run verify
npm run test:db
SUPABASE_PUBLISHABLE_KEY="<local key>" npm run test:matching
```

`npm run verify` checks formatting, lint, strict TypeScript, and unit tests. pgTAP
covers RLS denial, matching invariants, check-in idempotency, and protected XP. The
concurrency script signs in four seeded users, fires simultaneous matching operations,
and verifies one unique assignment per user.

Docker Desktop or another compatible Docker runtime is required for local Supabase and
pgTAP. CI runs both the app and database suites.

## Edge Functions and production

Deployment, secrets, schedules, and account-purge behavior are documented in
[`docs/OPERATIONS.md`](docs/OPERATIONS.md). The complete device acceptance checklist is
in [`docs/E2E_SMOKE.md`](docs/E2E_SMOKE.md), and the screen-by-screen light/dark
acceptance matrix is in [`docs/VISUAL_QA.md`](docs/VISUAL_QA.md).

Build profiles are EAS-compatible:

```sh
eas build --profile development --platform all
eas build --profile staging-development --platform ios
eas build --profile staging-development --platform android
```

The staging profile is an internal development-client build backed by the EAS
`preview` environment-variable set. It sets the app runtime to `staging`, displays a
non-production marker, and fails unless the Supabase URL and project ref match. Follow
the ordered deployment and device checklist in
[`docs/STAGING_RELEASE.md`](docs/STAGING_RELEASE.md) before starting either cloud
build.

Keep the check-in pepper, cron secret, Expo push access token, and Supabase service key
out of the mobile environment. Production store builds are intentionally outside the
staging procedure.

## Project map

```text
app/                         Protected Expo Router screens
src/components/              Reusable accessible UI and state components
src/domain/                  Pure gesture and route-validation rules
src/features/                Queries, mutations, parsing, demo adapters
src/lib/                     Environment, logging, query, Supabase, secure storage
src/providers/               Auth, theme, notification, and app providers
supabase/migrations/         Schema, trusted functions, RLS, Storage, Realtime
supabase/functions/          Authenticated and cron-authenticated Edge Functions
supabase/tests/              pgTAP authorization and integrity tests
scripts/                     Concurrency verification
docs/                        Operations and end-to-end runbooks
```

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for trust boundaries and
[`SECURITY.md`](SECURITY.md) for the authorization matrix and threat model.
