import { withSupabase } from '@supabase/server';

import { jsonError } from '../_shared/http.ts';
import { isAuthorizedCronRequest } from '../_shared/internal.ts';

type ExpoReceipt = {
  status: 'ok' | 'error';
  details?: { error?: string };
};

const receiptEndpoint = 'https://exp.host/--/api/v2/push/getReceipts';

export default {
  fetch: withSupabase({ auth: 'none' }, async (request, context) => {
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
    }
    if (!isAuthorizedCronRequest(request)) {
      return jsonError('Unauthorized.', 401, 'UNAUTHORIZED');
    }

    const { data: queued, error: queueError } = await context.supabaseAdmin
      .from('push_receipts')
      .select('id, ticket_id, push_token_id')
      .eq('status', 'pending')
      .lte('created_at', new Date(Date.now() - 15 * 60_000).toISOString())
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60_000).toISOString())
      .limit(300);
    if (queueError) {
      return jsonError('Receipt lookup failed.', 500, 'RECEIPT_LOOKUP_FAILED');
    }
    if (!queued?.length) return Response.json({ checked: 0, invalidated: 0 });

    const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const response = await fetch(receiptEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({ ids: queued.map((receipt) => receipt.ticket_id) })
    });
    if (!response.ok) {
      return jsonError('Expo receipt request failed.', 502, 'EXPO_RECEIPT_FAILED');
    }
    const payload = (await response.json()) as {
      data?: Record<string, ExpoReceipt>;
    };

    let invalidated = 0;
    for (const queuedReceipt of queued) {
      const receipt = payload.data?.[queuedReceipt.ticket_id];
      if (!receipt) continue;
      const errorCode = receipt.details?.error ?? null;
      const { error: updateError } = await context.supabaseAdmin
        .from('push_receipts')
        .update({
          status: receipt.status === 'ok' ? 'delivered' : 'error',
          error_code: errorCode,
          checked_at: new Date().toISOString()
        })
        .eq('id', queuedReceipt.id)
        .eq('status', 'pending');
      if (updateError) continue;

      if (errorCode === 'DeviceNotRegistered') {
        const { error: invalidationError } = await context.supabaseAdmin
          .from('push_tokens')
          .update({ invalidated_at: new Date().toISOString() })
          .eq('id', queuedReceipt.push_token_id);
        if (!invalidationError) invalidated += 1;
      }
    }

    return Response.json({ checked: queued.length, invalidated });
  })
};
