import { withSupabase } from '@supabase/server';
import type { Database } from '../_shared/database.types.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

import { jsonError } from '../_shared/http.ts';
import { isAuthorizedCronRequest } from '../_shared/internal.ts';
import { sendPushToProfiles } from '../_shared/push.ts';

type Candidate = {
  groupId: string;
  eventType:
    'confirmation_deadline' | 'checkin_available' | 'event_starting' | 'venue_revealed';
  title: string;
  body: string;
  url: string;
};

type EventNotificationJob = {
  id: string;
  profile_id: string;
  event_id: string | null;
  kind: string;
  attempts: number;
  payload: Record<string, unknown>;
};

function eventJobCopy(
  kind: string,
  eventTitle: string
): {
  category: 'transactional' | 'activity';
  title: string;
  body: string;
} {
  switch (kind) {
    case 'rsvp_confirmed':
      return {
        category: 'transactional',
        title: 'You’re confirmed',
        body: `${eventTitle} is in My Events and its attendee chat is ready.`
      };
    case 'rsvp_waitlisted':
      return {
        category: 'transactional',
        title: 'You’re on the waitlist',
        body: `Ruckus will let you know if a spot opens for ${eventTitle}.`
      };
    case 'rsvp_pending':
      return {
        category: 'transactional',
        title: 'Request sent',
        body: `The host will review your request for ${eventTitle}.`
      };
    case 'rsvp_rejected':
      return {
        category: 'transactional',
        title: 'RSVP update',
        body: `Your request for ${eventTitle} was not approved.`
      };
    case 'waitlist_promoted':
      return {
        category: 'transactional',
        title: 'A spot opened',
        body: `You’re now confirmed for ${eventTitle}.`
      };
    case 'event_cancelled':
      return {
        category: 'transactional',
        title: 'Event cancelled',
        body: `${eventTitle} was cancelled. Open Ruckus for the current status.`
      };
    case 'event_announcement':
      return {
        category: 'activity',
        title: `Update from ${eventTitle}`,
        body: 'The host posted an announcement. Open the private event space to read it.'
      };
    default:
      return {
        category: 'activity',
        title: 'Event update',
        body: `${eventTitle} has a new status update.`
      };
  }
}

async function claimDispatch(
  admin: SupabaseClient,
  candidate: Candidate
): Promise<boolean> {
  const { data, error } = await admin
    .from('notification_dispatches')
    .insert({ event_type: candidate.eventType, source_id: candidate.groupId })
    .select('id')
    .maybeSingle();
  if (error?.code === '23505') return false;
  if (error) throw error;
  return Boolean(data);
}

export default {
  fetch: withSupabase<Database>({ auth: 'none' }, async (request, context) => {
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
    }
    if (!isAuthorizedCronRequest(request)) {
      return jsonError('Unauthorized.', 401, 'UNAUTHORIZED');
    }

    const { data: groups, error: groupError } = await context.supabaseAdmin
      .from('groups')
      .select('id, status, confirmation_deadline, venue_revealed_at, activity_session_id')
      .in('status', ['pending_confirmation', 'confirmed'])
      .limit(500);
    if (groupError) {
      return jsonError('Notification sweep failed.', 500, 'SWEEP_FAILED');
    }
    const sessionIds = [
      ...new Set((groups ?? []).map((group) => group.activity_session_id))
    ];
    const { data: sessions, error: sessionError } = await context.supabaseAdmin
      .from('activity_sessions')
      .select('id, starts_at, checkin_opens_at')
      .in('id', sessionIds);
    if (sessionError) {
      return jsonError('Notification sweep failed.', 500, 'SWEEP_FAILED');
    }

    const sessionMap = new Map((sessions ?? []).map((session) => [session.id, session]));
    const now = Date.now();
    const candidates: Candidate[] = [];
    for (const group of groups ?? []) {
      const session = sessionMap.get(group.activity_session_id);
      if (!session) continue;

      const deadlineMs = new Date(group.confirmation_deadline).getTime();
      if (
        group.status === 'pending_confirmation' &&
        deadlineMs > now &&
        deadlineMs <= now + 15 * 60_000
      ) {
        candidates.push({
          groupId: group.id,
          eventType: 'confirmation_deadline',
          title: 'Confirm your crew now',
          body: 'The attendance deadline is less than 15 minutes away.',
          url: `/group/${group.id}`
        });
      }

      if (group.status === 'confirmed') {
        const startMs = new Date(session.starts_at).getTime();
        const checkinMs = session.checkin_opens_at
          ? new Date(session.checkin_opens_at).getTime()
          : startMs - 15 * 60_000;
        if (checkinMs <= now && checkinMs > now - 6 * 60_000) {
          candidates.push({
            groupId: group.id,
            eventType: 'checkin_available',
            title: 'Check-in is open',
            body: 'Meet at the lobby’s public venue and scan your host’s rotating QR.',
            url: `/check-in/${group.id}`
          });
        }
        if (startMs > now && startMs <= now + 60 * 60_000) {
          candidates.push({
            groupId: group.id,
            eventType: 'event_starting',
            title: 'Your activity starts soon',
            body: 'Open the lobby for your public meeting spot and crew updates.',
            url: `/group/${group.id}`
          });
        }
        const revealedMs = group.venue_revealed_at
          ? new Date(group.venue_revealed_at).getTime()
          : 0;
        if (revealedMs <= now && revealedMs > now - 6 * 60_000) {
          candidates.push({
            groupId: group.id,
            eventType: 'venue_revealed',
            title: 'Your meeting spot is unlocked',
            body: 'The crew confirmed. Open the lobby for the approved public venue.',
            url: `/group/${group.id}`
          });
        }
      }
    }

    let dispatched = 0;

    const { data: claimedJobs, error: claimError } = await context.supabaseAdmin.rpc(
      'claim_notification_jobs',
      { max_jobs: 50 }
    );
    if (claimError) {
      return jsonError('Notification job claim failed.', 500, 'JOB_CLAIM_FAILED');
    }
    const eventJobs = (claimedJobs ?? []) as EventNotificationJob[];
    const eventIds = [
      ...new Set(eventJobs.flatMap((job) => (job.event_id ? [job.event_id] : [])))
    ];
    const { data: eventRows, error: eventError } = eventIds.length
      ? await context.supabaseAdmin.from('events').select('id,title').in('id', eventIds)
      : { data: [], error: null };
    if (eventError) {
      return jsonError('Notification event lookup failed.', 500, 'EVENT_LOOKUP_FAILED');
    }
    const eventTitles = new Map(
      (eventRows ?? []).map((event) => [event.id, event.title])
    );

    for (const job of eventJobs) {
      try {
        const eventTitle = job.event_id
          ? (eventTitles.get(job.event_id) ?? 'Your event')
          : 'Your event';
        const copy = eventJobCopy(job.kind, eventTitle);
        await sendPushToProfiles(context.supabaseAdmin, {
          profileIds: [job.profile_id],
          category: copy.category,
          title: copy.title,
          body: copy.body,
          url: job.event_id ? `/event/${job.event_id}` : '/my-events',
          event: job.kind
        });
        await context.supabaseAdmin
          .from('notification_jobs')
          .update({
            status: 'sent',
            processed_at: new Date().toISOString(),
            last_error_code: null
          })
          .eq('id', job.id)
          .eq('status', 'processing');
        dispatched += 1;
      } catch (error) {
        const permanent = job.attempts >= 5;
        await context.supabaseAdmin
          .from('notification_jobs')
          .update({
            status: permanent ? 'failed' : 'pending',
            scheduled_for: new Date(
              Date.now() + Math.max(1, job.attempts) * 5 * 60_000
            ).toISOString(),
            last_error_code: error instanceof Error ? error.name.slice(0, 80) : 'UNKNOWN'
          })
          .eq('id', job.id)
          .eq('status', 'processing');
      }
    }

    for (const candidate of candidates) {
      if (!(await claimDispatch(context.supabaseAdmin, candidate))) continue;
      const { data: members } = await context.supabaseAdmin
        .from('group_members')
        .select('profile_id')
        .eq('group_id', candidate.groupId)
        .eq('status', 'active');
      await sendPushToProfiles(context.supabaseAdmin, {
        profileIds: (members ?? []).map((member) => member.profile_id),
        category: 'activity',
        title: candidate.title,
        body: candidate.body,
        url: candidate.url,
        event: candidate.eventType,
        groupId: candidate.groupId
      });
      dispatched += 1;
    }

    const { data: xpEntries, error: xpError } = await context.supabaseAdmin
      .from('xp_ledger')
      .select('id, profile_id, amount, reason')
      .gte('created_at', new Date(now - 6 * 60_000).toISOString())
      .limit(500);
    if (xpError) {
      return jsonError('XP notification sweep failed.', 500, 'SWEEP_FAILED');
    }
    for (const entry of xpEntries ?? []) {
      const claimed = await context.supabaseAdmin
        .from('notification_dispatches')
        .insert({ event_type: 'xp_awarded', source_id: entry.id })
        .select('id')
        .maybeSingle();
      if (claimed.error) {
        if (claimed.error.code === '23505') continue;
        throw claimed.error;
      }
      if (!claimed.data) continue;
      await sendPushToProfiles(context.supabaseAdmin, {
        profileIds: [entry.profile_id],
        category: 'transactional',
        title: entry.amount >= 0 ? `+${entry.amount} XP awarded` : `${entry.amount} XP`,
        body: `Your participation ledger was updated: ${entry.reason.replaceAll('_', ' ')}.`,
        url: '/profile',
        event: 'xp_awarded'
      });
      dispatched += 1;
    }

    return Response.json({
      considered: candidates.length + (xpEntries?.length ?? 0),
      dispatched
    });
  })
};
