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

    const { data, error } = await context.supabaseAdmin.rpc(
      'publish_due_campus_announcements'
    );
    if (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'campus_announcements.publish_failed',
          code: error.code
        })
      );
      return jsonError('Announcement publishing failed.', 500, 'PUBLISH_FAILED');
    }

    const report = { announcementsTransitioned: data ?? 0 };
    console.info(
      JSON.stringify({
        level: 'info',
        event: 'campus_announcements.published',
        ...report
      })
    );
    return Response.json(report);
  })
};
