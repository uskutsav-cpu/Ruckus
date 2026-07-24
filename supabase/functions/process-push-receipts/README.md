# process-push-receipts

Schedule every 15 minutes with `x-campus-clash-cron-secret`. The sender stores accepted
Expo ticket IDs in the service-only `push_receipts` table. This worker fetches mature
receipts, records terminal delivery/error state, and invalidates device tokens that
Expo reports as `DeviceNotRegistered`.
