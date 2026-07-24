import { describe, expect, it } from 'vitest';

import { parseLobby } from '@/features/groups/group-parser';

describe('parseLobby', () => {
  it('accepts the trusted lobby response shape', () => {
    expect(
      parseLobby({
        id: '50000000-0000-4000-8000-000000000001',
        status: 'confirmed',
        confirmationDeadline: '2026-07-25T18:00:00.000Z',
        activitySessionId: '40000000-0000-4000-8000-000000000001',
        title: 'Sunset Trail Dash',
        startsAt: '2026-07-25T19:00:00.000Z',
        endsAt: '2026-07-25T20:30:00.000Z',
        venue: {
          name: 'Student Pavilion',
          address: '210 Campus Loop',
          notes: null
        },
        members: [
          {
            id: '10000000-0000-4000-8000-000000000001',
            displayName: 'Maya',
            avatarPath: null,
            isHost: false,
            confirmation: 'confirmed'
          }
        ]
      }).venue
    ).toEqual({
      name: 'Student Pavilion',
      address: '210 Campus Loop',
      notes: null
    });
  });

  it('rejects a lobby missing required fields', () => {
    expect(() => parseLobby({ id: 'group', members: [] })).toThrow('Invalid lobby field');
  });
});
