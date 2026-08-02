import { requireSupabase } from '@/lib/supabase';
import type { ProfilePreferencesRow } from '@/types/database';

export type ReferralSummary = {
  code: string;
  attributed: number;
  qualified: number;
  rewarded: number;
};

export async function fetchAccountTools(
  userId: string,
  isDemo: boolean
): Promise<{
  preferences: ProfilePreferencesRow;
  referral: ReferralSummary;
  exportRequest: { id: string; status: string; requestedAt: string } | null;
}> {
  if (isDemo) {
    return {
      preferences: {
        profile_id: userId,
        leaderboard_visible: true,
        show_attended_history: false,
        show_hosted_history: true,
        event_reminders: true,
        chat_notifications: true,
        announcement_notifications: true,
        notification_previews: false,
        reduced_motion: false,
        accessibility_notes: null,
        discovery_preferences: {},
        profile_visibility: 'friends',
        attendance_visibility: 'friends',
        allow_friend_requests: true,
        follow_policy: 'approval',
        show_in_social_suggestions: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      referral: { code: 'RUCKUSDEMO', attributed: 0, qualified: 0, rewarded: 0 },
      exportRequest: null
    };
  }
  const supabase = requireSupabase();
  const { data: code, error: codeError } = await supabase.rpc(
    'ensure_user_referral_code'
  );
  if (codeError) throw codeError;
  const [preferencesResult, referralsResult, exportsResult] = await Promise.all([
    supabase.from('profile_preferences').select('*').eq('profile_id', userId).single(),
    supabase.from('referrals').select('status,referral_codes!inner(owner_profile_id)'),
    supabase
      .from('data_export_requests')
      .select('id,status,requested_at')
      .eq('profile_id', userId)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);
  if (preferencesResult.error) throw preferencesResult.error;
  if (referralsResult.error) throw referralsResult.error;
  if (exportsResult.error) throw exportsResult.error;
  const referrals = referralsResult.data ?? [];
  return {
    preferences: preferencesResult.data,
    referral: {
      code,
      attributed: referrals.filter((row) => row.status === 'attributed').length,
      qualified: referrals.filter((row) => row.status === 'qualified').length,
      rewarded: referrals.filter((row) => row.status === 'rewarded').length
    },
    exportRequest: exportsResult.data
      ? {
          id: exportsResult.data.id,
          status: exportsResult.data.status,
          requestedAt: exportsResult.data.requested_at
        }
      : null
  };
}

export async function updateProfilePreferences(
  userId: string,
  input: Partial<
    Pick<
      ProfilePreferencesRow,
      | 'leaderboard_visible'
      | 'show_attended_history'
      | 'show_hosted_history'
      | 'reduced_motion'
      | 'accessibility_notes'
    >
  >,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase()
    .from('profile_preferences')
    .update(input)
    .eq('profile_id', userId);
  if (error) throw error;
}

export async function requestDataExport(isDemo: boolean): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('request_data_export');
  if (error) throw error;
}

export async function applyReferralCode(code: string, isDemo: boolean): Promise<string> {
  if (isDemo) return 'attributed';
  const { data, error } = await requireSupabase().rpc('attribute_referral', {
    referral_code: code.trim().toUpperCase()
  });
  if (error) throw error;
  return data;
}
