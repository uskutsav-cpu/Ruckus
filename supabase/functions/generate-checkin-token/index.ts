import { withSupabase } from '@supabase/server';

import {
  checkinPepper,
  createRawCheckinToken,
  digestCheckinToken
} from '../_shared/checkin.ts';
import { isUuid, jsonError } from '../_shared/http.ts';

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
    }

    let body: { groupId?: unknown };
    try {
      body = (await request.json()) as { groupId?: unknown };
    } catch {
      return jsonError('A JSON body is required.', 400, 'INVALID_JSON');
    }
    if (!isUuid(body.groupId)) {
      return jsonError('A valid group is required.', 422, 'INVALID_GROUP');
    }

    const pepper = checkinPepper();
    if (!pepper) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'checkin.pepper_missing'
        })
      );
      return jsonError(
        'Check-in is temporarily unavailable.',
        503,
        'CHECKIN_NOT_CONFIGURED'
      );
    }

    const rawToken = createRawCheckinToken();
    const digest = await digestCheckinToken(rawToken, pepper);
    const lifetimeSeconds = 90;
    const { data: tokenId, error } = await context.supabase.rpc(
      'create_checkin_token_digest',
      {
        target_group_id: body.groupId,
        digest_value: digest,
        lifetime_seconds: lifetimeSeconds
      }
    );
    if (error) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'checkin.generate_rejected',
          code: error.code
        })
      );
      return jsonError(
        'Only the group host can show check-in during the event window.',
        403,
        'TOKEN_GENERATION_NOT_ALLOWED'
      );
    }

    const expiresAt = new Date(Date.now() + lifetimeSeconds * 1000).toISOString();
    return Response.json({
      tokenId,
      expiresAt,
      qrPayload: `campusclash://check-in/${body.groupId}?token=${rawToken}`
    });
  })
};
