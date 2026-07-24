import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) =>
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false))
  )
);

function onAppStateChange(status: AppStateStatus): void {
  focusManager.setFocused(status === 'active');
}

AppState.addEventListener('change', onAppStateChange);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error) => {
        const status =
          typeof error === 'object' && error && 'status' in error
            ? Number(error.status)
            : 0;
        return status >= 400 && status < 500 ? false : failureCount < 2;
      }
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 1
    }
  }
});
