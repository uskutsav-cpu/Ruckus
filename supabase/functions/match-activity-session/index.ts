import { withSupabase } from '@supabase/server';

import { isUuid, jsonError, publicDatabaseError } from '../_shared/http.ts';
import { sendPushToProfiles } from '../_shared/push.ts';

type MatchResult = {
  state: 'waiting' | 'matched' | 'passed';
  decision: 'interested' | 'pass';
  duplicate: boolean;
  groupId?: string;
  memberCount?: number;
  memberIds?: string[];
  confirmationDeadline?: string;
  waitlistSize?: number;
};

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
    }

    let body: { activitySessionId?: unknown };
    try {
      body = (await request.json()) as { activitySessionId?: unknown };
    } catch {
      return jsonError('A JSON body is required.', 400, 'INVALID_JSON');
    }

    if (!isUuid(body.activitySessionId)) {
      return jsonError(
        'A valid activity session is required.',
        422,
        'INVALID_ACTIVITY_SESSION'
      );
    }

    const { data, error } = await context.supabase.rpc('process_swipe_and_match', {
      target_session_id: body.activitySessionId
    });

    if (error) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'matching.rpc_rejected',
          code: error.code
        })
      );
      const safe = publicDatabaseError(error.message);
      return jsonError(safe.message, safe.status, safe.code);
    }

    const result = data as MatchResult;
    if (result.state === 'matched' && result.groupId && Array.isArray(result.memberIds)) {
      await sendPushToProfiles(context.supabaseAdmin, {
        profileIds: result.memberIds,
        category: 'transactional',
        title: 'Crew assembled — confirm now ⚡',
        body: 'Your group formed. Confirm now before the countdown ends.',
        url: `/group/${result.groupId}`,
        event: 'group_formed',
        groupId: result.groupId
      });
    }

    return Response.json(result);
  })
};
