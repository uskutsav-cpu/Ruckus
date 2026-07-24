import {
  confirmDemoAttendance,
  getDemoLobby,
  getDemoMessages,
  getDemoPendingMatches,
  leaveDemoGroup,
  sendDemoMessage
} from '@/features/groups/demo-groups';
import { localActivityImage } from '@/features/activities/demo-activities';
import { parseLobby } from '@/features/groups/group-parser';
import type {
  ChatMessage,
  GroupLobby,
  PendingMatch
} from '@/features/groups/group-types';
import { requireSupabase } from '@/lib/supabase';
import type { MessageRow } from '@/types/database.generated';

const messagePageSize = 30;

export async function fetchGroupLobby(
  groupId: string,
  isDemo: boolean
): Promise<GroupLobby> {
  if (isDemo) {
    const lobby = getDemoLobby();
    if (!lobby || lobby.id !== groupId) throw new Error('Group not found.');
    return lobby;
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('get_group_lobby', {
    target_group_id: groupId
  });
  if (error) throw error;
  return parseLobby(data);
}

export async function fetchGroups(isDemo: boolean): Promise<GroupLobby[]> {
  if (isDemo) {
    const lobby = getDemoLobby();
    return lobby ? [lobby] : [];
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('status', 'active')
    .order('joined_at', { ascending: false });
  if (error) throw error;

  const groupIds = [...new Set((data ?? []).map((member) => member.group_id))];
  return Promise.all(groupIds.map((groupId) => fetchGroupLobby(groupId, false)));
}

export async function fetchPendingMatches(isDemo: boolean): Promise<PendingMatch[]> {
  if (isDemo) return getDemoPendingMatches();

  const supabase = requireSupabase();
  const { data: waitlist, error: waitlistError } = await supabase
    .from('waitlist_entries')
    .select('id, activity_session_id, joined_at')
    .eq('status', 'waiting')
    .order('joined_at', { ascending: false });
  if (waitlistError) throw waitlistError;
  if (!waitlist?.length) return [];

  const sessionIds = waitlist.map((entry) => entry.activity_session_id);
  const { data: sessions, error: sessionError } = await supabase
    .from('activity_sessions')
    .select('id, activity_template_id, starts_at')
    .in('id', sessionIds);
  if (sessionError) throw sessionError;

  const templateIds = [
    ...new Set((sessions ?? []).map((row) => row.activity_template_id))
  ];
  const { data: templates, error: templateError } = await supabase
    .from('activity_templates')
    .select('id, title, image_path')
    .in('id', templateIds);
  if (templateError) throw templateError;

  const sessionMap = new Map((sessions ?? []).map((row) => [row.id, row]));
  const templateMap = new Map((templates ?? []).map((row) => [row.id, row]));
  const imagePaths = (templates ?? [])
    .map((template) => template.image_path)
    .filter((path): path is string => Boolean(path));
  const signedImages = new Map<string, string>();
  if (imagePaths.length) {
    const { data: signed } = await supabase.storage
      .from('activity-images')
      .createSignedUrls(imagePaths, 60 * 60);
    signed?.forEach((image) => {
      if (image.path && image.signedUrl) {
        signedImages.set(image.path, image.signedUrl);
      }
    });
  }
  return waitlist.flatMap((entry) => {
    const session = sessionMap.get(entry.activity_session_id);
    const template = session ? templateMap.get(session.activity_template_id) : undefined;
    if (!session || !template) return [];
    const imageUrl = template.image_path
      ? signedImages.get(template.image_path)
      : undefined;
    return [
      {
        id: entry.id,
        activitySessionId: entry.activity_session_id,
        title: template.title,
        startsAt: session.starts_at,
        joinedAt: entry.joined_at,
        imageSource: imageUrl
          ? { uri: imageUrl }
          : localActivityImage(session.activity_template_id)
      }
    ];
  });
}

export async function confirmAttendance(groupId: string, isDemo: boolean): Promise<void> {
  if (isDemo) {
    confirmDemoAttendance();
    return;
  }
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('confirm_attendance', {
    target_group_id: groupId
  });
  if (error) throw error;
}

export async function leaveGroup(groupId: string, isDemo: boolean): Promise<void> {
  if (isDemo) {
    leaveDemoGroup();
    return;
  }
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('leave_group', {
    target_group_id: groupId,
    apply_late_penalty: true
  });
  if (error) throw error;
}

export async function finalizeGroup(
  groupId: string,
  isDemo: boolean
): Promise<{ checkedInCount: number; noShowCount: number }> {
  if (isDemo) return { checkedInCount: 4, noShowCount: 0 };
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('finalize_group_attendance', {
    target_group_id: groupId
  });
  if (error) throw error;
  if (
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data) ||
    typeof data.checkedInCount !== 'number' ||
    typeof data.noShowCount !== 'number'
  ) {
    throw new Error('The attendance finalization response was invalid.');
  }
  return {
    checkedInCount: data.checkedInCount,
    noShowCount: data.noShowCount
  };
}

function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    groupId: row.group_id,
    senderId: row.sender_id,
    kind: row.kind,
    body: row.body,
    clientId: row.client_id,
    createdAt: row.created_at
  };
}

export async function fetchMessagePage(
  groupId: string,
  page: number,
  isDemo: boolean
): Promise<ChatMessage[]> {
  const offset = page * messagePageSize;
  if (isDemo) return getDemoMessages(offset, messagePageSize);

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + messagePageSize - 1);
  if (error) throw error;
  return (data ?? []).map(toChatMessage);
}

export function hasNextMessagePage(page: ChatMessage[]): boolean {
  return page.length === messagePageSize;
}

export async function sendMessage(
  input: {
    groupId: string;
    senderId: string;
    clientId: string;
    body: string;
  },
  isDemo: boolean
): Promise<ChatMessage> {
  const optimistic: ChatMessage = {
    id: input.clientId,
    groupId: input.groupId,
    senderId: input.senderId,
    kind: 'text',
    body: input.body,
    clientId: input.clientId,
    createdAt: new Date().toISOString()
  };
  if (isDemo) return sendDemoMessage(optimistic);

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      group_id: input.groupId,
      sender_id: input.senderId,
      kind: 'text',
      body: input.body,
      client_id: input.clientId
    })
    .select()
    .single();
  if (error) throw error;
  const saved = toChatMessage(data);
  void supabase.functions.invoke('notify-chat-message', {
    body: { messageId: saved.id }
  });
  return saved;
}
