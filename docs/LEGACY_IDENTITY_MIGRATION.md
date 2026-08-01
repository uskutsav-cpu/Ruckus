# Legacy identity compatibility

User-facing product copy is Ruckus. The codebase retains internal `campus-clash` package,
Supabase local project, storage keys, cron header, advisory-lock namespace, Android/iOS
bundle `com.campusclash.app`, and `campusclash` URL scheme because no reliable evidence
proves that external credentials or installed sessions are disposable.

The new `ruckus` scheme is primary and legacy links remain accepted through a strict
allowlist. Existing storage keys preserve sessions/preferences; new referral storage
uses a Ruckus key. Historical migration comments/identifiers are not rewritten.

Before a future rename, the owner must inventory shipped builds, EAS project, Apple/Play
records, Supabase redirect URLs, push credentials, universal/app links, installed-user
storage, scheduler headers, and third-party callbacks. Then ship a backward-compatible
read/migrate/write sequence before removing legacy support. Do not rename identifiers
for cosmetic reasons during this prerelease pass.
