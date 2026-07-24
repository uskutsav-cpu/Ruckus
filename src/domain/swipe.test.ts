import { describe, expect, it } from 'vitest';

import { getSwipeDecision } from '@/domain/swipe';

describe('getSwipeDecision', () => {
  it('waits when neither distance nor velocity clears the threshold', () => {
    expect(getSwipeDecision(119, 799)).toBeNull();
  });

  it('uses distance for a deliberate drag', () => {
    expect(getSwipeDecision(140, 100)).toBe('right');
    expect(getSwipeDecision(-140, -100)).toBe('left');
  });

  it('uses velocity for a fast flick', () => {
    expect(getSwipeDecision(20, 900)).toBe('right');
    expect(getSwipeDecision(-20, -900)).toBe('left');
  });
});
