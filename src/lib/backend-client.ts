import type { ClientEnv } from '@/lib/env';

export function createClientForEnvironment<T>(
  environment: ClientEnv,
  factory: (url: string, publishableKey: string) => T
): T | null {
  if (
    environment.backendMode !== 'connected' ||
    !environment.supabaseUrl ||
    !environment.supabasePublishableKey
  ) {
    return null;
  }
  return factory(environment.supabaseUrl, environment.supabasePublishableKey);
}
