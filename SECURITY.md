# Security policy

Do not disclose a vulnerability, credential, private user record, report, or exploit in
a public issue. Use GitHub’s private vulnerability reporting for the public repository;
the permanent security email and response SLA remain owner release gates. For immediate
physical danger, contact local emergency services—not the project repository.

## Baseline controls

- University-domain email is campus access, not identity proof; users attest 18+.
- The mobile bundle accepts only validated Supabase URL/publishable-key configuration.
- User-accessible tables have RLS plus explicit grants; unsafe transitions use narrow
  trusted functions. The client never receives the service role.
- Capacity/waitlists, role/verification changes, QR redemption, XP, referrals,
  notification claiming, and moderation are server-controlled and idempotent where
  repeat execution is possible.
- Public views omit attendees, chat, internal roles, reports, email, and exact
  coordinates. Private Realtime repeats event membership.
- Logs/analytics exclude bodies, report evidence, passwords, tokens, precise location,
  and sensitive profile fields.
- Raw QR values are not stored; check-in validates digest, lifetime, revocation,
  membership, confirmation, event window, and replay.

Run `npm run verify`, clean `npm run db:reset`, `npm run test:db`, concurrency harnesses,
platform exports, dependency audit, and secret/history scans before release. Never
weaken RLS to unblock UI code. Every new privileged operation needs denial tests.

The detailed authorization matrix, threat model, privacy map, and moderation operations
are in `docs/RLS_AUTHORIZATION_MATRIX.md`, `docs/THREAT_MODEL.md`,
`docs/PRIVACY_DATA_MAP.md`, and `docs/MODERATION_OPERATIONS.md`.
