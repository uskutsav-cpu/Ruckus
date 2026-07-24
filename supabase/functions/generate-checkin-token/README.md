# generate-checkin-token

Authenticated hosts call this during the configured event check-in window. The raw,
256-bit random token exists only in this response and the QR display. Postgres stores
only `SHA-256(raw_token + server_pepper)`, and creating a new token revokes the prior
active token for the group.

Configure and deploy:

```sh
npx supabase secrets set CHECKIN_TOKEN_PEPPER='<at-least-32-random-characters>'
npx supabase functions deploy generate-checkin-token
```
