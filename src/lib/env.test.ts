import { createClientForEnvironment } from '@/lib/backend-client';
import {
  PublicEnvironmentError,
  resolveClientEnvironment,
  type RawClientEnvironment
} from '@/lib/env';

const validEnvironment: RawClientEnvironment = {
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_with_safe_length',
  EXPO_PUBLIC_SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
  EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN: 'example.edu'
};

const validStagingEnvironment: RawClientEnvironment = {
  ...validEnvironment,
  EXPO_PUBLIC_APP_ENV: 'staging',
  EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN: 'utexas.edu',
  EXPO_PUBLIC_EAS_PROJECT_ID: '7fd3c48e-8375-4f65-86c4-57e5ad6bb274'
};

describe('public environment configuration', () => {
  it('uses intentional demo mode when both Supabase variables are absent', () => {
    const environment = resolveClientEnvironment({});

    expect(environment.backendMode).toBe('demo');
    expect(environment.isDemoAvailable).toBe(true);
    expect(environment.supabaseUrl).toBeUndefined();
    expect(environment.supabasePublishableKey).toBeUndefined();
  });

  it('accepts valid connected development credentials', () => {
    const environment = resolveClientEnvironment(validEnvironment);

    expect(environment.backendMode).toBe('connected');
    expect(environment.isBackendConfigured).toBe(true);
    expect(environment.configurationError).toBeNull();
  });

  it('returns an actionable development error for a malformed URL', () => {
    const environment = resolveClientEnvironment({
      ...validEnvironment,
      EXPO_PUBLIC_SUPABASE_URL: 'not-a-url'
    });

    expect(environment.backendMode).toBe('configuration-error');
    expect(environment.isDemoAvailable).toBe(false);
    expect(environment.configurationError).toContain(
      'EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL'
    );
  });

  it('returns an actionable development error for a missing publishable key', () => {
    const environment = resolveClientEnvironment({
      EXPO_PUBLIC_SUPABASE_URL: validEnvironment.EXPO_PUBLIC_SUPABASE_URL
    });

    expect(environment.backendMode).toBe('configuration-error');
    expect(environment.configurationError).toContain(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing'
    );
  });

  it('does not instantiate a client during demo startup', () => {
    const environment = resolveClientEnvironment({});
    const factory = vi.fn(() => ({ connected: true }));

    expect(createClientForEnvironment(environment, factory)).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it.each(['staging', 'production'] as const)(
    'fails %s validation when credentials are missing',
    (appEnvironment) => {
      expect(() =>
        resolveClientEnvironment({ EXPO_PUBLIC_APP_ENV: appEnvironment })
      ).toThrow(PublicEnvironmentError);
    }
  );

  it('accepts a complete UT Austin staging environment', () => {
    expect(resolveClientEnvironment(validStagingEnvironment).backendMode).toBe(
      'connected'
    );
  });

  it('rejects a hosted URL that does not match its project ref', () => {
    expect(() =>
      resolveClientEnvironment({
        ...validStagingEnvironment,
        EXPO_PUBLIC_SUPABASE_URL: 'https://zyxwvutsrqponmlkjihg.supabase.co'
      })
    ).toThrow(/does not match EXPO_PUBLIC_SUPABASE_PROJECT_REF/);
  });

  it('rejects staging configured for a non-pilot email domain', () => {
    expect(() =>
      resolveClientEnvironment({
        ...validStagingEnvironment,
        EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN: 'example.edu'
      })
    ).toThrow(/staging requires.*utexas\.edu/);
  });

  it('rejects staging without an EAS project ID', () => {
    expect(() =>
      resolveClientEnvironment({
        ...validStagingEnvironment,
        EXPO_PUBLIC_EAS_PROJECT_ID: undefined
      })
    ).toThrow(/EXPO_PUBLIC_EAS_PROJECT_ID is missing/);
  });
});
