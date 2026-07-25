import { describe, expect, it } from 'vitest';

import { CheckinScanError, parseCheckinPayload } from '@/features/checkin/checkin-parser';

const groupId = '50000000-0000-4000-8000-000000000001';
const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

describe('parseCheckinPayload', () => {
  it('extracts a scoped 256-bit check-in token', () => {
    expect(
      parseCheckinPayload(`campusclash://check-in/${groupId}?token=${token}`, groupId)
    ).toBe(token);
  });

  it('rejects codes for another group', () => {
    expect(() =>
      parseCheckinPayload(
        `campusclash://check-in/50000000-0000-4000-8000-000000000002?token=${token}`,
        groupId
      )
    ).toThrow('different group');
  });

  it('classifies QR codes for another group', () => {
    try {
      parseCheckinPayload(
        `campusclash://check-in/50000000-0000-4000-8000-000000000002?token=${token}`,
        groupId
      );
    } catch (error) {
      expect(error).toBeInstanceOf(CheckinScanError);
      expect((error as CheckinScanError).issue).toBe('wrong-group');
    }
  });

  it('rejects non-Ruckus URLs and short tokens', () => {
    expect(() =>
      parseCheckinPayload(`https://example.com/check-in/${groupId}?token=short`, groupId)
    ).toThrow('not a valid Ruckus check-in code');
  });
});
