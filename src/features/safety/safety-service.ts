import { supabase } from '@/lib/supabase';

type ReportInput = {
  reporterId: string;
  messageId?: string;
  userId?: string;
  groupId?: string;
  reason: string;
  details: string;
  blockUser: boolean;
};

export async function submitReport(input: ReportInput, isDemo: boolean): Promise<void> {
  if (isDemo) return;

  if (input.messageId) {
    const { error } = await supabase.rpc('report_message', {
      target_message_id: input.messageId,
      report_reason: input.reason,
      ...(input.details.trim() ? { report_details: input.details.trim() } : {})
    });
    if (error) throw error;
  } else {
    const targetType = input.userId ? 'user' : 'group';
    const { error } = await supabase.from('reports').insert({
      reporter_id: input.reporterId,
      target_type: targetType,
      target_user_id: input.userId ?? null,
      target_message_id: null,
      target_group_id: input.groupId ?? null,
      reason: input.reason,
      details: input.details.trim() || null,
      status: 'submitted',
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null
    });
    if (error) throw error;
  }

  if (input.blockUser && input.userId) {
    const { error } = await supabase.rpc('block_user', {
      target_profile_id: input.userId
    });
    if (error) throw error;
  }
}

export async function requestAccountDeletion(isDemo: boolean): Promise<void> {
  if (isDemo) return;
  const { error } = await supabase.rpc('request_account_deletion');
  if (error) throw error;
}
