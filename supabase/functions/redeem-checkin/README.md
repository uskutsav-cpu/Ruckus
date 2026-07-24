# redeem-checkin

Authenticated students send the raw QR token to this endpoint. The function validates
its exact format, adds the server-only pepper, hashes it, and invokes the transactional
redemption RPC. The RPC verifies membership, confirmation, group status, event window,
expiry, and uniqueness before it appends the +50 XP ledger entry.

The same `CHECKIN_TOKEN_PEPPER` secret used by `generate-checkin-token` is required.
