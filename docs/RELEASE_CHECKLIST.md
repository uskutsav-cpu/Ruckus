# Prerelease checklist

## Automated gates

- [x] Clean `npm ci`
- [x] Format, lint, strict TypeScript, unit tests
- [x] Clean database reset and full pgTAP
- [x] Event-capacity and crew concurrency
- [x] Edge Function validation/bundle
- [x] Web, iOS, and Android exports; Expo Doctor
- [x] Dependency audit reviewed (no blind force upgrade)
- [x] Working tree and complete Git history secret/PII scan
- [ ] CI configuration validated; generated types and lockfile current
- [ ] Final diff/status and non-destructive merge to `main`

## Product/security review

- [x] Public pages expose no attendee/chat/private-coordinate/report data
- [x] RSVP/waitlist/check-in/XP/referral/moderation tests and denial cases pass
- [x] Admin route hidden in UI and rejected server-side for non-admins
- [x] Notification payloads, logs, and analytics contain no sensitive content
- [x] Demo/staging labels and protected-build fail-closed behavior verified
- [x] Legacy identifiers classified per `LEGACY_IDENTITY_MIGRATION.md`

## External/manual gates

- [ ] `DEVICE_QA.md` completed on representative iOS and Android hardware
- [ ] Hosted Supabase/email/push/scheduler/deletion/partnership smoke tests
- [ ] Accessibility-expert, moderation-operations, legal/privacy, and campus review
- [ ] Support/security contacts and public legal/deletion URLs approved
- [ ] Final branded screenshots and store metadata approved
- [ ] Public GitHub repository created/pushed and remote contents verified

A prerelease tag may truthfully record automated completion while external boxes remain
open. It must not be called production 1.0 or store-ready.
