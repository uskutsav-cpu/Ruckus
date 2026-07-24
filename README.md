# Campus Clash

Campus Clash is a swipe-based social activity MVP for verified adult students at one
launch university. Interest in scheduled activities feeds a concurrency-safe group
matching flow; confirmed members can chat, meet at a public venue, check in with a
short-lived QR token, and earn server-awarded XP.

## Implementation plan

1. Scaffold Expo SDK 57, strict TypeScript, quality tooling, and EAS profiles.
2. Build the versioned Postgres schema, trusted functions, RLS, Storage policies,
   seed data, and adversarial SQL tests.
3. Add email authentication, verification, age attestation, and onboarding.
4. Add the gesture-driven activity deck with durable, idempotent swipes.
5. Add the authenticated matching Edge Function and atomic database transaction.
6. Add group lobbies, confirmations, private Realtime chat, and safety controls.
7. Add short-lived QR issuance/redemption and append-only XP.
8. Add leaderboard, notifications, reporting, blocking, settings, and deletion.
9. Finish automated verification, security documentation, CI, and build instructions.

## Proposed directory structure

```text
app/                         Expo Router route groups and screens
src/components/              Reusable UI and state components
src/features/                Feature-specific hooks, services, and components
src/lib/                     Environment, Supabase, logging, networking, query cache
src/providers/               Auth, theme, query, notifications
src/theme/                   Tokens and light/dark palettes
src/types/                   Generated database and application types
src/domain/                  Pure matching, swipe, XP, and deep-link logic
supabase/migrations/         Version-controlled schema, trusted SQL, RLS, Storage
supabase/functions/          Authenticated Deno Edge Functions
supabase/seed.sql            Demo campus, sessions, and local test users
supabase/tests/              pgTAP policy and trusted-operation tests
docs/                        Smoke-test and operational runbooks
.github/workflows/           CI quality gate
```

Setup and local-development instructions will be finalized as the implementation
milestones land.

## Local backend

The backend is reproducible from migrations and seed data. Docker Desktop (or another
Docker-compatible runtime) is required.

```sh
cp .env.example .env
npm install
npm run db:start
npm run db:reset
npm run test:db
```

Use `npx supabase status -o env` to copy the local API URL and publishable key into
`.env`. The seeded login password is `CampusClash1!`; accounts
`demo1@example.edu` through `demo6@example.edu`, `host@example.edu`, and
`admin@example.edu` are local-only.

After a fresh reset, validate concurrent matching with:

```sh
SUPABASE_PUBLISHABLE_KEY="<local publishable key>" npm run test:matching
```

This fires four right swipes concurrently and verifies that every account is assigned
exactly once to the same group.
