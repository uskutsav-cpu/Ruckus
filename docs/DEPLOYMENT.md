# Deployment

Deployment requires an owner-created Supabase project, EAS project, campus domain,
support/legal decisions, and approved public URLs. Do not infer or create them.

1. Run the release checklist and secret/history audit on a clean tree.
2. Configure hosted client values in the matching EAS environment. Staging requires
   `RUCKUS_BUILD_TARGET=staging`; production requires the production counterpart.
3. Set independent Edge secrets: QR pepper, cron secret, partnership rate-limit pepper,
   and optional Expo access token. Never prefix them `EXPO_PUBLIC_`.
4. Link and verify the exact Supabase project, review pending migrations, push schema
   without seed data, deploy reviewed functions (including `partnership-lead`), and
   configure authorized redirect URLs/origins.
5. Schedule notification sweep (5 min), push receipts (15 min), and deletion purge
   (daily) with the independent cron header.
6. Build internal iOS/Android candidates, execute `docs/DEVICE_QA.md`, and only then
   decide whether to promote a prerelease.

Rollback application code with the prior EAS update/build. Database migrations are
forward-fix by default; do not destructively roll back user data. Disable a compromised
function/scheduler, rotate its secret, preserve safe audit logs, and ship an additive
repair.
