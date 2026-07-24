import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const sessionId = '40000000-0000-4000-8000-000000000001';
const password = 'CampusClash1!';

if (!publishableKey) {
  throw new Error(
    'SUPABASE_PUBLISHABLE_KEY is required. Copy it from `npx supabase status -o env`.'
  );
}

const emails = [
  'demo1@example.edu',
  'demo2@example.edu',
  'demo3@example.edu',
  'demo4@example.edu'
];

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
