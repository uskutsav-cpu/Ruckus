import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>{children}</AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
