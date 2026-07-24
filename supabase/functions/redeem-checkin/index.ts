import { withSupabase } from '@supabase/server';

import {
  checkinPepper,
  digestCheckinToken,
  isRawCheckinToken
} from '../_shared/checkin.ts';
import { jsonError } from '../_shared/http.ts';

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
    }

    let body: { token?: unknown };
    try {
      body = (await request.json()) as { token?: unknown };
    } catch {
      return jsonError('A JSON body is required.', 400, 'INVALID_JSON');
    }
    if (!isRawCheckinToken(body.token)) {
      return jsonError('This QR code is invalid.', 422, 'INVALID_CHECKIN_TOKEN');
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

    const digest = await digestCheckinToken(body.token, pepper);
    const { data, error } = await context.supabase.rpc('redeem_checkin_token_digest', {
      digest_value: digest
    });
    if (error) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'checkin.redeem_rejected',
          code: error.code
        })
      );
      return jsonError(
        'This code expired, was replaced, or is not valid for your group.',
        403,
        'CHECKIN_NOT_ALLOWED'
      );
    }

    return Response.json(data);
  })
};
