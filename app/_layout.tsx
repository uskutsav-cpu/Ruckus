import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BackendConfigurationScreen } from '@/components/backend-configuration-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { env } from '@/lib/env';
import { AppProviders } from '@/providers/app-providers';
import { useAuth } from '@/providers/auth-provider';
import { NotificationBootstrap } from '@/providers/notification-bootstrap';
import { useTheme } from '@/providers/theme-provider';

function RootNavigator() {
  const { isDark, theme } = useTheme();
  const { isLoading, profile, user } = useAuth();

  if (env.configurationError) {
    return <BackendConfigurationScreen message={env.configurationError} />;
  }
  if (isLoading) return <LoadingScreen />;

  const onboardingComplete = Boolean(
    profile?.age_attested &&
    profile.safety_acknowledged_at &&
    profile.onboarding_completed_at
  );
  const deletionPending = Boolean(profile?.deletion_requested_at);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NotificationBootstrap />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="public" options={{ headerShown: false }} />
        <Stack.Screen
          name="account-deletion-confirmed"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(user && !deletionPending && !onboardingComplete)}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(user && deletionPending)}>
          <Stack.Screen
            name="account-pending-deletion"
            options={{ headerShown: false }}
          />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(user && !deletionPending && onboardingComplete)}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </GestureHandlerRootView>
  );
}
