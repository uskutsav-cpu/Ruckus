import { AppState, Platform } from 'react-native';
import { setupURLPolyfill } from 'react-native-url-polyfill';

import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';

import { createClientForEnvironment } from '@/lib/backend-client';
import { env } from '@/lib/env';
import { secureStorage } from '@/lib/secure-storage';
import type { Database } from '@/types/database.generated';

setupURLPolyfill();

type RuckusSupabaseClient = SupabaseClient<Database>;

export const supabase = createClientForEnvironment<RuckusSupabaseClient>(
  env,
  (url, publishableKey) =>
    createClient<Database>(url, publishableKey, {
      auth: {
        ...(Platform.OS === 'web' ? {} : { storage: secureStorage }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
);

export function requireSupabase(): RuckusSupabaseClient {
  if (supabase) return supabase;
  throw new Error(
    env.configurationError ??
      'This action needs a connected Ruckus development environment.'
  );
}

if (Platform.OS !== 'web' && supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
