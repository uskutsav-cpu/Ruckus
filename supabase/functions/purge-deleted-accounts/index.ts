import { withSupabase } from '@supabase/server';

import { jsonError } from '../_shared/http.ts';
import { isAuthorizedCronRequest } from '../_shared/internal.ts';

const retentionDays = 7;
const batchSize = 50;

export default {
  fetch: withSupabase({ auth: 'none' }, async (request, context) => {
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
    }
    if (!isAuthorizedCronRequest(request)) {
      return jsonError('Unauthorized.', 401, 'UNAUTHORIZED');
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60_000).toISOString();
    const { data: profiles, error } = await context.supabaseAdmin
      .from('profiles')
      .select('id')
      .not('deletion_requested_at', 'is', null)
      .lt('deletion_requested_at', cutoff)
      .limit(batchSize);
    if (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'account_purge.lookup_failed',
          code: error.code
        })
      );
      return jsonError('Purge lookup failed.', 500, 'PURGE_FAILED');
    }

    let deleted = 0;
    let failed = 0;
    for (const profile of profiles ?? []) {
      const { data: objects } = await context.supabaseAdmin.storage
        .from('avatars')
        .list(profile.id, { limit: 100 });
      if (objects?.length) {
        await context.supabaseAdmin.storage
          .from('avatars')
          .remove(objects.map((object) => `${profile.id}/${object.name}`));
      }

      const { error: deleteError } = await context.supabaseAdmin.auth.admin.deleteUser(
        profile.id
      );
      if (deleteError) {
        failed += 1;
      } else {
        deleted += 1;
      }
    }

    console.info(
      JSON.stringify({
        level: 'info',
        event: 'account_purge.completed',
        attempted: profiles?.length ?? 0,
        deleted,
        failed
      })
    );
    return Response.json({ attempted: profiles?.length ?? 0, deleted, failed });
  })
};
