# Local development

Prerequisites: Node 22.13+, npm, Docker, Supabase CLI through the project dependency,
and Xcode/Android tooling only for native builds.

```sh
npm ci
cp .env.example .env
npm run db:start
npm run db:reset
npx supabase status -o env
```

Set the local URL and publishable key in `.env`; do not use the service key. With both
empty, development is an intentional labeled demo. Partial values are rejected.
`supabase/seed.sql` creates fake `example.edu` users using `RuckusLocal1!` and must never
be pushed to a hosted database.

Use `npm run start:go`, `npm run ios`, or `npm run android`. Validate with
`npm run verify`, `npm run test:db`, both concurrency scripts, and Expo exports. If the
local Supabase stack is resource-constrained, omit nonessential Studio/analytics/media
containers, but keep database, Auth, REST, and gateway running.
