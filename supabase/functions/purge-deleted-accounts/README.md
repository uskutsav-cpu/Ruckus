# purge-deleted-accounts

Schedule this internal function daily. It hard-deletes Auth users whose deletion
request is at least seven days old and removes their avatar objects first. The Auth
foreign-key cascade removes profile-owned data; retained group messages become
anonymous because `messages.sender_id` uses `ON DELETE SET NULL`.

Set a random secret and send it in `x-campus-clash-cron-secret`:

```sh
npx supabase secrets set CRON_SECRET='<at-least-32-random-characters>'
npx supabase functions deploy purge-deleted-accounts
```

Do not expose the cron secret in an `EXPO_PUBLIC_*` variable.
