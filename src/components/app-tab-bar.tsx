import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const tabs = [
  { path: '/discover', label: 'Discover', icon: 'discover' },
  { path: '/my-events', label: 'My Events', icon: 'calendar' },
  { path: '/create-event', label: 'Create', icon: 'add' },
  { path: '/chats', label: 'Chats', icon: 'chat' },
  { path: '/profile', label: 'Profile', icon: 'person' }
] as const satisfies readonly {
  path: '/discover' | '/my-events' | '/create-event' | '/chats' | '/profile';
  label: string;
  icon: AppIconName;
}[];

export const primaryTabPaths = new Set<string>(tabs.map((tab) => tab.path));

export function AppTabBar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: theme.surfaceElevated,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, tokens.space.xs)
        }
      ]}
    >
      {tabs.map((tab) => {
        const selected = pathname === tab.path;
        const color = selected ? theme.primary : theme.textMuted;
        return (
          <Pressable
            key={tab.path}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => router.replace(tab.path)}
            style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.62 : 1 }]}
          >
            <View
              style={[
                styles.iconWell,
                selected ? { backgroundColor: theme.accentMuted } : undefined
              ]}
            >
              <AppIcon name={tab.icon} color={color} size={21} />
            </View>
            <Text numberOfLines={1} style={[styles.label, { color }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space.xs,
    paddingHorizontal: tokens.space.xs
  },
  tab: {
    minHeight: 58,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  iconWell: {
    width: 42,
    height: 28,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontSize: 11,
    fontWeight: tokens.weight.bold
  }
});
