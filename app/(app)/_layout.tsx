import { useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoModeBanner } from '@/components/demo-mode-banner';
import { AppTabBar, primaryTabPaths } from '@/components/app-tab-bar';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function AppLayout() {
  const { isDemo } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [demoBannerHeight, setDemoBannerHeight] = useState(42);
  const pathname = usePathname();
  const bannerMode = isDemo
    ? 'demo'
    : env.appEnvironment === 'staging'
      ? 'staging'
      : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {bannerMode ? (
        <SafeAreaView
          edges={['top']}
          onLayout={(event) => {
            const contentHeight = Math.max(
              42,
              event.nativeEvent.layout.height - insets.top
            );
            setDemoBannerHeight(contentHeight);
          }}
          pointerEvents="none"
          style={[styles.demoOverlay, { backgroundColor: theme.accentMuted }]}
        >
          <DemoModeBanner mode={bannerMode} />
        </SafeAreaView>
      ) : null}
      <View
        style={[styles.stack, bannerMode ? { marginTop: demoBannerHeight } : undefined]}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 220
          }}
        >
          <Stack.Screen name="deck" options={{ animation: 'fade' }} />
          <Stack.Screen name="discover" options={{ animation: 'fade' }} />
          <Stack.Screen name="my-events" options={{ animation: 'fade' }} />
          <Stack.Screen name="create-event" options={{ animation: 'fade' }} />
          <Stack.Screen name="chats" options={{ animation: 'fade' }} />
          <Stack.Screen name="pending" />
          <Stack.Screen name="groups" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="profile/edit" />
          <Stack.Screen name="organizations" />
          <Stack.Screen name="organization/create" />
          <Stack.Screen name="organization/[id]" />
          <Stack.Screen name="admin/moderation" />
          <Stack.Screen name="admin/campus" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="privacy-and-growth" />
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
          <Stack.Screen name="event/[id]" />
          <Stack.Screen name="event/[id]/chat" />
          <Stack.Screen name="event/[id]/check-in" />
          <Stack.Screen name="event/[id]/manage" />
        </Stack>
        {primaryTabPaths.has(pathname) ? <AppTabBar /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { flex: 1 },
  demoOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 10
  }
});
