import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const isLocalTarget = ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
const sessionId =
  process.env.MATCHING_TEST_SESSION_ID ??
  (isLocalTarget ? '40000000-0000-4000-8000-000000000001' : undefined);
const password =
  process.env.MATCHING_TEST_PASSWORD ?? (isLocalTarget ? 'CampusClash1!' : undefined);

if (!publishableKey) {
  throw new Error(
    'SUPABASE_PUBLISHABLE_KEY is required. Copy it from `npx supabase status -o env`.'
  );
}

const emails = process.env.MATCHING_TEST_EMAILS
  ? process.env.MATCHING_TEST_EMAILS.split(',').map((email) => email.trim())
  : isLocalTarget
    ? ['demo1@example.edu', 'demo2@example.edu', 'demo3@example.edu', 'demo4@example.edu']
    : [];

if (!sessionId || !password || emails.length !== 4 || emails.some((email) => !email)) {
  throw new Error(
    'Hosted matching checks require MATCHING_TEST_SESSION_ID, MATCHING_TEST_PASSWORD, and exactly four comma-separated MATCHING_TEST_EMAILS. Keep these values in an ignored local environment file.'
  );
}

const clients = await Promise.all(
  emails.map(async (email) => {
    const client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`${email}: ${error.message}`);
    return client;
  })
);

const results = await Promise.all(
  clients.map(async (client) => {
    const { data, error } = await client.rpc('process_swipe_and_match', {
      target_session_id: sessionId
    });
    if (error) throw error;
    return data;
  })
);

const states = results.map((result) => result.state);
if (states.filter((state) => state === 'matched').length !== 1) {
  throw new Error(`Expected one formation response, received ${JSON.stringify(states)}`);
}

const waitlistRows = await Promise.all(
  clients.map(async (client) => {
    const { data, error } = await client
      .from('waitlist_entries')
      .select('status, matched_group_id')
      .eq('activity_session_id', sessionId)
      .single();
    if (error) throw error;
    return data;
  })
);

const groupIds = new Set(waitlistRows.map((row) => row.matched_group_id));
if (
  waitlistRows.some((row) => row.status !== 'matched') ||
  groupIds.size !== 1 ||
  groupIds.has(null)
) {
  throw new Error(`Concurrent assignment failed: ${JSON.stringify(waitlistRows)}`);
}

process.stdout.write(
  `Concurrency check passed: four users assigned once to ${[...groupIds][0]}\n`
);
