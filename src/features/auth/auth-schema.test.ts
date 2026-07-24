import { describe, expect, it } from 'vitest';

import { onboardingSchema, signUpSchema } from '@/features/auth/auth-schema';

describe('signUpSchema', () => {
  it('accepts the configured campus domain and a strong password', () => {
    expect(
      signUpSchema.safeParse({
        displayName: 'Maya',
        email: 'Maya@example.edu',
        password: 'CampusClash1!'
      }).success
    ).toBe(true);
  });

  it('rejects a non-campus email', () => {
    expect(
      signUpSchema.safeParse({
        displayName: 'Maya',
        email: 'maya@personal.test',
        password: 'CampusClash1!'
      }).success
    ).toBe(false);
  });
});

describe('onboardingSchema', () => {
  const input = {
    displayName: 'Maya',
    graduationYear: new Date().getFullYear() + 2,
    bio: '',
    interestIds: [
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003'
    ]
  };

  it('requires at least three interests', () => {
    expect(onboardingSchema.safeParse(input).success).toBe(true);
    expect(
      onboardingSchema.safeParse({ ...input, interestIds: input.interestIds.slice(0, 2) })
        .success
    ).toBe(false);
  });
});
