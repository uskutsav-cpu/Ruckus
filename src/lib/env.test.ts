import { createClientForEnvironment } from '@/lib/backend-client';
import {
  PublicEnvironmentError,
  resolveClientEnvironment,
  type RawClientEnvironment
} from '@/lib/env';

const validEnvironment: RawClientEnvironment = {
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_SUPABASE_URL: 'https://example-project.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_with_safe_length',
  EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN: 'example.edu'
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

  it.each(['preview', 'production'] as const)(
    'fails %s validation when credentials are missing',
    (appEnvironment) => {
      expect(() =>
        resolveClientEnvironment({ EXPO_PUBLIC_APP_ENV: appEnvironment })
      ).toThrow(PublicEnvironmentError);
    }
  );
});
