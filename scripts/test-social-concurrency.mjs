import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const isLocalTarget = ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
const localStatus = isLocalTarget
  ? execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
  : '';
const localKey = localStatus.match(/^(?:PUBLISHABLE_KEY|ANON_KEY)="?([^"\n]+)"?$/m)?.[1];
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? localKey;
const password =
  process.env.SOCIAL_TEST_PASSWORD ?? (isLocalTarget ? 'RuckusLocal1!' : undefined);
const emails = process.env.SOCIAL_TEST_EMAILS
  ? process.env.SOCIAL_TEST_EMAILS.split(',').map((email) => email.trim())
  : isLocalTarget
    ? ['demo1@example.edu', 'demo2@example.edu']
    : [];

if (!publishableKey) {
  throw new Error(
    'SUPABASE_PUBLISHABLE_KEY is required. Copy it from `npx supabase status -o env`.'
  );
}
if (!password || emails.length !== 2 || emails.some((email) => !email)) {
  throw new Error(
    'Hosted social checks require SOCIAL_TEST_PASSWORD and exactly two comma-separated SOCIAL_TEST_EMAILS. Keep credentials in an ignored local environment file.'
  );
}

async function signedInClient(email) {
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`${email}: ${error?.message ?? 'No user'}`);
  return { client, profileId: data.user.id };
}

const [first, second] = await Promise.all(emails.map(signedInClient));

// Blocking is a trusted, reversible cleanup primitive: it removes any existing
// relationship in both directions before this repeatable check.
const { error: blockError } = await first.client.rpc('block_user', {
  target_profile_id: second.profileId
});
if (blockError) throw blockError;
const { error: unblockError } = await first.client.rpc('unblock_user', {
  target_profile_id: second.profileId
});
if (unblockError) throw unblockError;

const results = await Promise.all(
  [
    [first, second.profileId],
    [second, first.profileId]
  ].map(async ([actor, targetId]) => {
    const { data, error } = await actor.client.rpc('send_friend_request', {
      target_profile_id: targetId
    });
    if (error) throw error;
    return data;
  })
);

const statuses = results.map((result) => result.status).sort();
if (statuses.join(',') !== 'accepted,pending') {
  throw new Error(
    `Expected one pending response and one reciprocal acceptance, received ${JSON.stringify(results)}`
  );
}

const overviews = await Promise.all(
  [first, second].map(async ({ client }) => {
    const { data, error } = await client.rpc('get_social_overview');
    if (error) throw error;
    return data;
  })
);
if (overviews.some((overview) => overview.counts.friends !== 1)) {
  throw new Error(`Expected one canonical friendship: ${JSON.stringify(overviews)}`);
}

const retryResults = await Promise.all(
  [
    [first, second.profileId],
    [second, first.profileId]
  ].map(async ([actor, targetId]) => {
    const { data, error } = await actor.client.rpc('send_friend_request', {
      target_profile_id: targetId
    });
    if (error) throw error;
    return data;
  })
);
if (
  retryResults.some((result) => result.status !== 'accepted' || !result.alreadyFriends)
) {
  throw new Error(`Friendship retry was not idempotent: ${JSON.stringify(retryResults)}`);
}

process.stdout.write(
  'Social concurrency check passed: reciprocal requests created one canonical friendship and retries were idempotent.\n'
);
