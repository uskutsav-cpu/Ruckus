import { describe, expect, it } from 'vitest';

import { safeNotificationRoute } from '@/features/notifications/notification-route';

const groupId = '50000000-0000-4000-8000-000000000001';

describe('safeNotificationRoute', () => {
  it('allows only known app destinations', () => {
    expect(safeNotificationRoute(`/group/${groupId}`)).toBe(`/group/${groupId}`);
    expect(safeNotificationRoute(`/group/${groupId}/chat`)).toBe(
      `/group/${groupId}/chat`
    );
    expect(safeNotificationRoute(`/check-in/${groupId}`)).toBe(`/check-in/${groupId}`);
    expect(safeNotificationRoute('/groups')).toBe('/groups');
  });

  it('rejects external, malformed, and parameterized destinations', () => {
    expect(safeNotificationRoute('https://evil.example')).toBeNull();
    expect(safeNotificationRoute('/settings')).toBeNull();
    expect(safeNotificationRoute(`/group/${groupId}?token=secret`)).toBeNull();
    expect(safeNotificationRoute({ url: '/groups' })).toBeNull();
  });
});
