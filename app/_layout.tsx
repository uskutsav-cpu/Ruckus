import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { AppProviders } from '@/providers/app-providers';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

function RootNavigator() {
  const { isDark, theme } = useTheme();
  const { isLoading, profile, user } = useAuth();

  if (isLoading) return <LoadingScreen />;

  const onboardingComplete = Boolean(
    profile?.age_attested &&
    profile.safety_acknowledged_at &&
    profile.onboarding_completed_at
  );

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(user && !onboardingComplete)}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(user && onboardingComplete)}>
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
