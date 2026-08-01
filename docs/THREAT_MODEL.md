# Threat model

Protected assets include account/session credentials, email and private profile fields,
RSVP/chat membership, message/report content, exact coordinates, raw QR values, XP,
roles/verification, push tokens, partnership contacts, and service secrets.

Primary threats and controls:

- Forged capacity/XP/roles/verification: direct writes revoked; trusted transactions,
  unique constraints, role checks, and pgTAP denial cases.
- Cross-event chat or Realtime enumeration: confirmed membership and scoped private
  topic policies; removed/deleted content is redacted by a trusted read model.
- QR capture/replay: random short lifetime, server pepper/hash, rotation/revocation,
  token locks, time/membership checks, and unique redemption.
- Blocks bypass: discovery/chat/member reads and matching repeat pairwise block checks;
  block RPC removes shared active access immediately.
- Public-page scraping: dedicated safe views omit attendees, chat, coordinates, email,
  internal roles, reports, and unpublished/restricted records.
- Notification leakage/duplication: deduplication keys, atomic `SKIP LOCKED` claiming,
  bounded retry, safe generic copy, route allowlist, preferences, token invalidation.
- Moderation abuse: server role verification, private queue, proportional action types,
  internal notes, suspension bounds, and immutable action audit.
- Secret/history leakage: public variables are validated; service/cron/pepper values are
  Edge-only; CI secret scanning and pre-public history audit are required.

Residual owner gates: production penetration review, campus abuse escalation contacts,
legal/privacy approval, hosted configuration review, device push/email validation, and
incident-response staffing.
