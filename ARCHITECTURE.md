# Architecture

Campus Clash uses a typed Expo Router client and a Supabase backend. The client is
untrusted: authorization, matching, group assignment, check-in, XP, and administrative
operations are enforced in Postgres functions and Edge Functions.

## Boundaries

- `app/` owns navigation and screen composition.
- `src/features/` owns feature queries and mutations.
- `src/domain/` contains deterministic rules with no React or Supabase dependency.
- `src/lib/` owns infrastructure adapters and validated configuration.
- `supabase/` is the source of truth for data integrity and authorization.

Client writes are limited by RLS. Multi-row operations execute in one Postgres
transaction behind narrow RPC functions. Edge Functions authenticate callers and
coordinate trusted side effects such as Expo push delivery; the service-role key never
ships in the application.
