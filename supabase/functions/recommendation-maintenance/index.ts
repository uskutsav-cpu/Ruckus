import { withSupabase } from '@supabase/server';
import type { Database } from '../_shared/database.types.ts';

import { configuredEmbeddingProvider } from '../_shared/embedding-provider.ts';
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

    const [collaborative, cleanup, embeddingQueue] = await Promise.all([
      context.supabaseAdmin.rpc('refresh_event_collaborative_signals'),
      context.supabaseAdmin.rpc('cleanup_recommendation_data', { batch_size: 5000 }),
      context.supabaseAdmin.rpc('queue_event_embedding_jobs')
    ]);
    const firstError = collaborative.error ?? cleanup.error ?? embeddingQueue.error;
    if (firstError) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'recommendations.maintenance_failed',
          code: firstError.code
        })
      );
      return jsonError('Recommendation maintenance failed.', 500, 'MAINTENANCE_FAILED');
    }

    const provider = configuredEmbeddingProvider();
    const report = {
      collaborativeSignals: collaborative.data ?? 0,
      expiredInteractionsRemoved: cleanup.data ?? 0,
      embeddingJobsQueued: embeddingQueue.data ?? 0,
      embeddingProvider: provider?.name ?? 'disabled'
    };
    console.info(
      JSON.stringify({ level: 'info', event: 'recommendations.maintenance', ...report })
    );
    return Response.json(report);
  })
};
