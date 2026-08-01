import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const isLocalTarget = ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
const localStatus = isLocalTarget
  ? execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
  : '';
const localKey = localStatus.match(/^(?:PUBLISHABLE_KEY|ANON_KEY)="?([^"\n]+)"?$/m)?.[1];
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? localKey;
const eventId =
  process.env.EVENT_CAPACITY_TEST_EVENT_ID ??
  (isLocalTarget ? '70000000-0000-4000-8000-000000000001' : undefined);
const password =
  process.env.EVENT_CAPACITY_TEST_PASSWORD ??
  (isLocalTarget ? 'RuckusLocal1!' : undefined);
const attendeeEmails = process.env.EVENT_CAPACITY_TEST_EMAILS
  ? process.env.EVENT_CAPACITY_TEST_EMAILS.split(',').map((email) => email.trim())
  : isLocalTarget
    ? ['demo1@example.edu', 'demo2@example.edu', 'demo3@example.edu', 'demo4@example.edu']
    : [];
const hostEmail =
  process.env.EVENT_CAPACITY_TEST_HOST_EMAIL ??
  (isLocalTarget ? 'host@example.edu' : undefined);

if (!publishableKey) {
  throw new Error(
    'SUPABASE_PUBLISHABLE_KEY is required. Copy it from `npx supabase status -o env`.'
  );
}

if (
  !eventId ||
  !password ||
  !hostEmail ||
  attendeeEmails.length !== 4 ||
  attendeeEmails.some((email) => !email)
) {
  throw new Error(
    'Hosted capacity checks require an event ID, password, host email, and exactly four attendee emails. Keep credentials in an ignored local environment file.'
  );
}

async function signedInClient(email) {
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return client;
}

const clients = await Promise.all(attendeeEmails.map(signedInClient));
const results = await Promise.all(
  clients.map(async (client) => {
    const { data, error } = await client.rpc('join_event', {
      target_event_id: eventId,
      request_key: randomUUID()
    });
    if (error) throw error;
    return data;
  })
);

const statuses = results.map((result) => result.status);
const confirmedResponses = statuses.filter((status) => status === 'confirmed').length;
const waitlistedResponses = statuses.filter((status) => status === 'waitlisted').length;
if (confirmedResponses !== 2 || waitlistedResponses !== 2) {
  throw new Error(
    `Expected two confirmed and two waitlisted responses, received ${JSON.stringify(statuses)}`
  );
}

const hostClient = await signedInClient(hostEmail);
const { data: rows, error: rowsError } = await hostClient
  .from('event_rsvps')
  .select('profile_id, status, waitlist_position')
  .eq('event_id', eventId);
if (rowsError) throw rowsError;

const confirmedRows = rows.filter((row) => row.status === 'confirmed');
const waitlistedRows = rows
  .filter((row) => row.status === 'waitlisted')
  .sort((left, right) => left.waitlist_position - right.waitlist_position);
if (
  rows.length !== 4 ||
  confirmedRows.length !== 2 ||
  waitlistedRows.length !== 2 ||
  waitlistedRows[0].waitlist_position !== 1 ||
  waitlistedRows[1].waitlist_position !== 2
) {
  throw new Error(`Capacity invariant failed: ${JSON.stringify(rows)}`);
}

process.stdout.write(
  `Capacity check passed: ${confirmedRows.length} confirmed, ${waitlistedRows.length} ordered waitlisted, capacity never exceeded.\n`
);
