import type {
  CheckinResult,
  GeneratedCheckinToken
} from '@/features/checkin/checkin-types';
import { supabase } from '@/lib/supabase';

const demoToken = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function generateCheckinToken(
  groupId: string,
  isDemo: boolean
): Promise<GeneratedCheckinToken> {
  if (isDemo) {
    return {
      tokenId: '90000000-0000-4000-8000-000000000001',
      expiresAt: new Date(Date.now() + 90_000).toISOString(),
      qrPayload: `campusclash://check-in/${groupId}?token=${demoToken}`
    };
  }
  const { data, error } = await supabase.functions.invoke('generate-checkin-token', {
    body: { groupId }
  });
  if (error) throw error;
  const result = data as Partial<GeneratedCheckinToken>;
  if (!result.tokenId || !result.expiresAt || !result.qrPayload) {
    throw new Error('The check-in code response was invalid.');
  }
  return result as GeneratedCheckinToken;
}

export async function redeemCheckinToken(
  token: string,
  isDemo: boolean
): Promise<CheckinResult> {
  if (isDemo) {
    if (token !== demoToken) throw new Error('This demo code is invalid.');
    return {
      success: true,
      alreadyCheckedIn: false,
      checkinId: 'a0000000-0000-4000-8000-000000000001',
      xpAwarded: 50
    };
  }
  const { data, error } = await supabase.functions.invoke('redeem-checkin', {
    body: { token }
  });
  if (error) throw error;
  const result = data as Partial<CheckinResult>;
  if (
    result.success !== true ||
    typeof result.alreadyCheckedIn !== 'boolean' ||
    typeof result.checkinId !== 'string' ||
    typeof result.xpAwarded !== 'number'
  ) {
    throw new Error('The check-in response was invalid.');
  }
  return result as CheckinResult;
}
