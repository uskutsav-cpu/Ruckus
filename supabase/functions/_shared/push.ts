import type { SupabaseClient } from '@supabase/supabase-js';

type PushTokenRow = {
  id: string;
  expo_push_token: string;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

type PushInput = {
  profileIds: string[];
  title: string;
  body: string;
  url: string;
  event: string;
  groupId?: string;
};

const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';

export async function sendPushToProfiles(
  admin: SupabaseClient,
  input: PushInput
): Promise<void> {
  if (input.profileIds.length === 0) return;

  const { data, error } = await admin
    .from('push_tokens')
    .select('id, expo_push_token')
    .in('profile_id', input.profileIds)
    .is('invalidated_at', null);

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'push.token_lookup_failed',
        code: error.code
      })
    );
    return;
  }

  const tokens = (data ?? []) as PushTokenRow[];
  if (tokens.length === 0) return;

  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  const response = await fetch(expoPushEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify(
      tokens.map((token) => ({
        to: token.expo_push_token,
        sound: 'default',
        title: input.title,
        body: input.body,
        channelId: 'activity-updates',
        data: {
          url: input.url,
          event: input.event,
          ...(input.groupId ? { groupId: input.groupId } : {})
        }
      }))
    )
  });

  if (!response.ok) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'push.delivery_failed',
        status: response.status
      })
    );
    return;
  }

  const payload = (await response.json()) as { data?: ExpoPushTicket[] };
  const invalidIds = (payload.data ?? [])
    .map((ticket, index) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
        ? tokens[index]?.id
        : undefined
    )
    .filter((id): id is string => Boolean(id));

  if (invalidIds.length > 0) {
    const { error: invalidationError } = await admin
      .from('push_tokens')
      .update({ invalidated_at: new Date().toISOString() })
      .in('id', invalidIds);

    if (invalidationError) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'push.invalidation_failed',
          count: invalidIds.length
        })
      );
    }
  }
}
