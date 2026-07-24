import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DemoModeBanner } from '@/components/demo-mode-banner';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function AppLayout() {
  const { isDemo } = useAuth();
  const { theme } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {isDemo ? (
        <SafeAreaView
          edges={['top']}
          pointerEvents="none"
          style={[styles.demoOverlay, { backgroundColor: theme.accentMuted }]}
        >
          <DemoModeBanner />
        </SafeAreaView>
      ) : null}
      <View style={[styles.stack, isDemo && styles.stackWithDemoBanner]}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 220
          }}
        >
          <Stack.Screen name="deck" options={{ animation: 'fade' }} />
          <Stack.Screen name="pending" />
          <Stack.Screen name="groups" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="profile/edit" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="legal" />
          <Stack.Screen name="account-deletion" />
          <Stack.Screen name="safety/index" />
          <Stack.Screen name="safety/emergency" />
          <Stack.Screen name="safety/guidelines" />
          <Stack.Screen name="report" />
          <Stack.Screen name="report-result" />
          <Stack.Screen name="rate/[sessionId]" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen name="group/[id]/chat" />
          <Stack.Screen name="group/[id]/host-check-in" />
          <Stack.Screen name="check-in/[groupId]" />
          <Stack.Screen name="check-in/result" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="activity/[id]"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { flex: 1 },
  stackWithDemoBanner: { marginTop: 42 },
  demoOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 10
  }
});
