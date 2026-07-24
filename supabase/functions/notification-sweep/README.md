# notification-sweep

Schedule every five minutes with the same internal `CRON_SECRET` header used by the
account purge. The function emits:

- confirmation-deadline reminders inside the final 15 minutes;
- check-in-available notifications as the event window opens; and
- event-starting reminders within the final hour;
- venue-revealed notices when a crew confirms; and
- XP ledger updates for awards and penalties.

`notification_dispatches` gives each group/event pair an at-most-once claim, and
`notification_preferences` filters disabled categories before Expo delivery.
