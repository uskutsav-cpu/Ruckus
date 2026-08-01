# Partnership lead

Public, server-validated intake for campus and organization interest. The function uses a
honeypot, input limits, per-source hashing, and a five-per-hour rate limit. It writes only
through the server-side admin client; the table has no anonymous client grants.

Set `PARTNERSHIP_RATE_LIMIT_PEPPER` to a random server-only value and
`PUBLIC_SITE_ORIGIN` to the production HTTPS origin. The Supabase service-role value is used
only as a local fallback pepper and is never returned or logged.
