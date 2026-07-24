# Security

This document evolves with the implementation. The baseline rules are:

- A university email verifies access to an allowed email domain; it is not proof of
  identity.
- The application is restricted to users who attest that they are at least 18.
- The mobile bundle contains only the Supabase URL and publishable key.
- Every exposed table uses RLS, with privileges revoked where direct writes are unsafe.
- XP, check-ins, matching, account deletion, and privileged moderation run only through
  trusted server operations.
- Check-in QR values are short lived; only a one-way digest is stored.
- Exact or background location is never collected.
- Meetings are group-based and reveal only approved public venues.

See the threat model and policy verification sections added in the security milestone.
