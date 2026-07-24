import type {
  LeaderboardEntry,
  LeaderboardPeriod,
  ProfileDashboard
} from '@/features/profile/profile-types';
import { supabase } from '@/lib/supabase';

const demoLeaderboard: LeaderboardEntry[] = [
  {
    profileId: '10000000-0000-4000-8000-000000000002',
    displayName: 'Jordan',
    avatarPath: null,
    xp: 340,
    rank: 1,
    isCurrentUser: false
  },
  {
    profileId: '10000000-0000-4000-8000-000000000004',
    displayName: 'Leo',
    avatarPath: null,
    xp: 295,
    rank: 2,
    isCurrentUser: false
  },
  {
    profileId: '10000000-0000-4000-8000-000000000001',
    displayName: 'Maya',
    avatarPath: null,
    xp: 260,
    rank: 3,
    isCurrentUser: true
  },
  {
    profileId: '10000000-0000-4000-8000-000000000003',
    displayName: 'Priya',
    avatarPath: null,
    xp: 205,
    rank: 4,
    isCurrentUser: false
  }
];

export async function fetchProfileDashboard(
  userId: string,
  avatarPath: string | null,
  isDemo: boolean
): Promise<ProfileDashboard> {
  if (isDemo) {
    return {
      xpTotal: 260,
      avatarUrl: null,
      selectedInterestIds: [],
      xpEntries: [
        {
          id: 'b0000000-0000-4000-8000-000000000001',
          amount: 50,
          reason: 'verified_checkin',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString()
        },
        {
          id: 'b0000000-0000-4000-8000-000000000002',
          amount: 10,
          reason: 'post_event_rating',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60_000 + 1000).toISOString()
        }
      ]
    };
  }

  const [
    { data: xpTotal, error: totalError },
    { data: ledger, error: ledgerError },
    { data: interests, error: interestError }
  ] = await Promise.all([
    supabase.rpc('get_xp_total'),
    supabase
      .from('xp_ledger')
      .select('id, amount, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('profile_interests').select('interest_id').eq('profile_id', userId)
  ]);
  if (totalError) throw totalError;
  if (ledgerError) throw ledgerError;
  if (interestError) throw interestError;

  let avatarUrl: string | null = null;
  if (avatarPath) {
    const { data } = await supabase.storage
      .from('avatars')
      .createSignedUrl(avatarPath, 60 * 60);
    avatarUrl = data?.signedUrl ?? null;
  }

  return {
    xpTotal: Number(xpTotal ?? 0),
    avatarUrl,
    selectedInterestIds: (interests ?? []).map((row) => row.interest_id),
    xpEntries: (ledger ?? []).map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      reason: entry.reason,
      createdAt: entry.created_at
    }))
  };
}

export async function fetchLeaderboard(
  period: LeaderboardPeriod,
  isDemo: boolean
): Promise<LeaderboardEntry[]> {
  if (isDemo) {
    const multiplier = period === 'week' ? 1 : period === 'month' ? 3 : 8;
    return demoLeaderboard.map((entry) => ({
      ...entry,
      xp: entry.xp * multiplier
    }));
  }
  const { data, error } = await supabase.rpc('get_leaderboard', { period });
  if (error) throw error;
  return (data ?? []).map((entry) => ({
    profileId: entry.profile_id,
    displayName: entry.display_name,
    avatarPath: entry.avatar_path,
    xp: Number(entry.xp),
    rank: Number(entry.rank),
    isCurrentUser: entry.is_current_user
  }));
}

export async function uploadAvatar(input: {
  userId: string;
  uri: string;
  mimeType: string;
}): Promise<string> {
  const extension = input.mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${input.userId}/avatar-${Date.now()}.${extension}`;
  const response = await fetch(input.uri);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 5 MB.');
  }
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, {
      contentType: input.mimeType,
      upsert: false,
      cacheControl: '3600'
    });
  if (uploadError) throw uploadError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_path: path })
    .eq('id', input.userId);
  if (profileError) throw profileError;
  return path;
}

export async function submitRating(
  sessionId: string,
  rating: number,
  feedback: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await supabase.rpc('submit_event_rating', {
    target_session_id: sessionId,
    rating_value: rating,
    ...(feedback.trim() ? { feedback_value: feedback.trim() } : {})
  });
  if (error) throw error;
}
