import { withSupabase } from '@supabase/server';
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
  fetch: withSupabase({ auth: 'none' }, async (request, context) => {
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
      if (claimed.error?.code === '23505' || !claimed.data) continue;
      if (claimed.error) throw claimed.error;
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
