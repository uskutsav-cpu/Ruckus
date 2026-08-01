import { describe, expect, it } from 'vitest';

import { normalizeReferralCode } from '@/features/referrals/pending-referral';

describe('normalizeReferralCode', () => {
  it('normalizes bounded alphanumeric referral codes', () => {
    expect(normalizeReferralCode(' ruckus123 ')).toBe('RUCKUS123');
  });

  it('rejects punctuation and out-of-range values', () => {
    expect(normalizeReferralCode('short')).toBeNull();
    expect(normalizeReferralCode('RUCKUS-123')).toBeNull();
    expect(normalizeReferralCode('A'.repeat(17))).toBeNull();
  });
});
