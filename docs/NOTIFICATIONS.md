# Notifications

The app educates users in Settings before requesting OS permission. Web and simulator
paths degrade without claiming push support. Tokens are device-scoped, refreshed by
registration, preference-filtered, invalidated for `DeviceNotRegistered`, and followed
through Expo receipts.

Event RSVP, waitlist, approval, promotion, cancellation, announcement, activity/check-in
reminders, and XP updates use server-owned jobs/dispatch markers. Workers atomically
claim due jobs with `FOR UPDATE SKIP LOCKED`, increment attempts, suppress duplicate
deduplication keys, use bounded five-minute backoff, and permanently fail after five
attempts. Routes pass a local allowlist before navigation.

Push copy never includes message bodies, report text, exact coordinates, emails, QR
values, or tokens. Announcement pushes say that an update exists and open the private
event space. Quiet-hour expansion and production timezone policy require owner product
approval; event timestamps remain timezone-explicit.

Schedule `notification-sweep` every five minutes and `process-push-receipts` every 15
minutes with independent cron authentication. Alert on claim, delivery, receipt, and
permanent-failure structured events.
