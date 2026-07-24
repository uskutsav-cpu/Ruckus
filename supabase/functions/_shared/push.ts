import type { SupabaseClient } from '@supabase/supabase-js';

type PushTokenRow = {
  id: string;
  expo_push_token: string;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

type PushInput = {
  profileIds: string[];
  category: 'transactional' | 'chat' | 'activity';
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

  const uniqueProfileIds = [...new Set(input.profileIds)];
  const { data: preferences, error: preferenceError } = await admin
    .from('notification_preferences')
    .select('profile_id, enabled, chat_messages, activity_reminders')
    .in('profile_id', uniqueProfileIds);
  if (preferenceError) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'push.preference_lookup_failed',
        code: preferenceError.code
      })
    );
    return;
  }
  const preferenceMap = new Map(
    (preferences ?? []).map((preference) => [preference.profile_id, preference])
  );
  const eligibleProfileIds = uniqueProfileIds.filter((profileId) => {
    const preference = preferenceMap.get(profileId);
    if (!preference) return true;
    if (!preference.enabled) return false;
    if (input.category === 'chat') return preference.chat_messages;
    if (input.category === 'activity') return preference.activity_reminders;
    return true;
  });
  if (eligibleProfileIds.length === 0) return;

  const { data, error } = await admin
    .from('push_tokens')
    .select('id, expo_push_token')
    .in('profile_id', eligibleProfileIds)
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
  const receipts = (payload.data ?? []).flatMap((ticket, index) => {
    const pushTokenId = tokens[index]?.id;
    if (ticket.status !== 'ok' || !ticket.id || !pushTokenId) return [];
    return [{ ticket_id: ticket.id, push_token_id: pushTokenId }];
  });
  if (receipts.length > 0) {
    const { error: receiptError } = await admin
      .from('push_receipts')
      .upsert(receipts, { onConflict: 'ticket_id', ignoreDuplicates: true });
    if (receiptError) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'push.receipt_queue_failed',
          count: receipts.length
        })
      );
    }
  }

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
