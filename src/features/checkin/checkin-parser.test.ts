import { describe, expect, it } from 'vitest';

import { parseCheckinPayload } from '@/features/checkin/checkin-parser';

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
    ).toThrow('not valid for your crew');
  });

  it('rejects non-Campus-Clash URLs and short tokens', () => {
    expect(() =>
      parseCheckinPayload(`https://example.com/check-in/${groupId}?token=short`, groupId)
    ).toThrow('not valid for your crew');
  });
});
