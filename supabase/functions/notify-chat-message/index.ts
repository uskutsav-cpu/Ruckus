import { withSupabase } from '@supabase/server';
import type { Database } from '../_shared/database.types.ts';

import { isUuid, jsonError } from '../_shared/http.ts';
import { sendPushToProfiles } from '../_shared/push.ts';

export default {
  fetch: withSupabase<Database>({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
    }
    let body: { messageId?: unknown };
    try {
      body = (await request.json()) as { messageId?: unknown };
    } catch {
      return jsonError('A JSON body is required.', 400, 'INVALID_JSON');
    }
    if (!isUuid(body.messageId)) {
      return jsonError('A valid message is required.', 422, 'INVALID_MESSAGE');
    }

    const [{ data: authData }, { data: message, error: messageError }] =
      await Promise.all([
        context.supabase.auth.getUser(),
        context.supabase
          .from('messages')
          .select('id, group_id, sender_id')
          .eq('id', body.messageId)
          .single()
      ]);
    if (
      messageError ||
      !authData.user ||
      !message ||
      message.sender_id !== authData.user.id
    ) {
      return jsonError('Message access denied.', 403, 'MESSAGE_ACCESS_DENIED');
    }

    const { data: members, error: memberError } = await context.supabaseAdmin
      .from('group_members')
      .select('profile_id')
      .eq('group_id', message.group_id)
      .eq('status', 'active')
      .neq('profile_id', authData.user.id);
    if (memberError) {
      return jsonError('Notification lookup failed.', 500, 'NOTIFICATION_FAILED');
    }

    await sendPushToProfiles(context.supabaseAdmin, {
      profileIds: (members ?? []).map((member) => member.profile_id),
      category: 'chat',
      title: 'New crew message',
      body: 'Open Ruckus to read it.',
      url: `/group/${message.group_id}/chat`,
      event: 'chat_message',
      groupId: message.group_id
    });
    return Response.json({ delivered: true });
  })
};
