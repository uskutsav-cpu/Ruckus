import { requireSupabase } from '@/lib/supabase';

type ReportInput = {
  messageId?: string;
  userId?: string;
  groupId?: string;
  reason: string;
  details: string;
  blockUser: boolean;
};

export async function submitReport(input: ReportInput, isDemo: boolean): Promise<void> {
  if (isDemo) return;
  const supabase = requireSupabase();

  if (input.messageId) {
    const { error } = await supabase.rpc('report_message', {
      target_message_id: input.messageId,
      report_reason: input.reason,
      ...(input.details.trim() ? { report_details: input.details.trim() } : {})
    });
    if (error) throw error;
  } else if (input.userId) {
    const { error } = await supabase.rpc('report_user', {
      target_profile_id: input.userId,
      report_reason: input.reason,
      ...(input.details.trim() ? { report_details: input.details.trim() } : {})
    });
    if (error) throw error;
  } else if (input.groupId) {
    const { error } = await supabase.rpc('report_group', {
      target_group_id: input.groupId,
      report_reason: input.reason,
      ...(input.details.trim() ? { report_details: input.details.trim() } : {})
    });
    if (error) throw error;
  } else {
    throw new Error('A report target is required.');
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
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('request_account_deletion');
  if (error) throw error;
}
