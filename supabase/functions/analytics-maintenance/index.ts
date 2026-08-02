import { withSupabase } from '@supabase/server';
import type { Database } from '../_shared/database.types.ts';

import { jsonError } from '../_shared/http.ts';
import { isAuthorizedCronRequest } from '../_shared/internal.ts';

export default {
  fetch: withSupabase<Database>({ auth: 'none' }, async (request, context) => {
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
    }
    if (!isAuthorizedCronRequest(request)) {
      return jsonError('Unauthorized.', 401, 'UNAUTHORIZED');
    }

    const [refresh, cleanup] = await Promise.all([
      context.supabaseAdmin.rpc('refresh_event_analytics'),
      context.supabaseAdmin.rpc('cleanup_event_analytics', { batch_size: 5000 })
    ]);
    const firstError = refresh.error ?? cleanup.error;
    if (firstError) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'analytics.maintenance_failed',
          code: firstError.code
        })
      );
      return jsonError('Analytics maintenance failed.', 500, 'MAINTENANCE_FAILED');
    }

    const report = {
      aggregateRowsRefreshed: refresh.data ?? 0,
      expiredAttributionVisitsRemoved: cleanup.data ?? 0
    };
    console.info(
      JSON.stringify({ level: 'info', event: 'analytics.maintenance', ...report })
    );
    return Response.json(report);
  })
};
