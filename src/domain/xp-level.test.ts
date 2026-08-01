import { describe, expect, it } from 'vitest';

import { getXpLevelProgress, xpRequiredForLevel } from '@/domain/xp-level';

describe('XP level curve', () => {
  it('uses one progressive quadratic threshold source', () => {
    expect([1, 2, 3, 4].map(xpRequiredForLevel)).toEqual([0, 250, 750, 1500]);
  });

  it('maps exact boundaries and clamps negative XP', () => {
    expect(getXpLevelProgress(-20)).toMatchObject({ level: 1, progress: 0 });
    expect(getXpLevelProgress(249).level).toBe(1);
    expect(getXpLevelProgress(250)).toMatchObject({ level: 2, progress: 0 });
    expect(getXpLevelProgress(750)).toMatchObject({ level: 3, progress: 0 });
  });
});
