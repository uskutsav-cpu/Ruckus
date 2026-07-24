# match-activity-session

Authenticated mobile entry point for a right swipe. The function:

1. lets the Edge gateway and `@supabase/server` validate the user JWT;
2. validates the activity-session UUID;
3. invokes `process_swipe_and_match` with the caller-scoped client;
4. sends a group-formed/confirmation-needed Expo push when the atomic RPC creates a
   group; and
5. invalidates tokens rejected as `DeviceNotRegistered`.

All matching and concurrency rules live in the single Postgres transaction. The Edge
Function does not reconstruct or partially apply them.

Deploy:

```sh
npx supabase functions deploy match-activity-session
```

`EXPO_ACCESS_TOKEN` is optional for projects that enable Expo Push Service access-token
security and must be configured with `supabase secrets set`, never in the mobile app.
