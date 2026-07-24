import { AppState, Platform } from 'react-native';
import { setupURLPolyfill } from 'react-native-url-polyfill';

import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import { secureStorage } from '@/lib/secure-storage';
import type { Database } from '@/types/database.generated';

setupURLPolyfill();

export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.supabaseUrl,
  env.supabasePublishableKey,
  {
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
  }
);

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
