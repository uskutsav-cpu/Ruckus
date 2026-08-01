import AsyncStorage from '@react-native-async-storage/async-storage';

const pendingReferralKey = 'ruckus.pending-referral-code';
const referralCodePattern = /^[A-Z0-9]{6,16}$/;

export function normalizeReferralCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return referralCodePattern.test(code) ? code : null;
}

export async function savePendingReferralCode(value: string): Promise<string | null> {
  const code = normalizeReferralCode(value);
  if (!code) return null;
  await AsyncStorage.setItem(pendingReferralKey, code);
  return code;
}

export async function getPendingReferralCode(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(pendingReferralKey);
  return stored ? normalizeReferralCode(stored) : null;
}

export async function clearPendingReferralCode(): Promise<void> {
  await AsyncStorage.removeItem(pendingReferralKey);
}
