import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export function PublicHeader() {
  const { user } = useAuth();
  const { theme } = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Ruckus home"
        onPress={() => router.push('/public')}
        style={styles.brand}
      >
        <View style={[styles.mark, { backgroundColor: theme.primary }]}>
          <AppIcon name="discover" color={theme.onPrimary} size={21} />
        </View>
        <Text style={[styles.brandText, { color: theme.text }]}>Ruckus</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/public/support')}
          style={styles.link}
        >
          <Text style={[styles.linkText, { color: theme.textMuted }]}>Support</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(user ? '/discover' : '/sign-in')}
          style={[styles.cta, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.ctaText, { color: theme.onPrimary }]}>
            {user ? 'Open app' : 'Sign in'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.layout.screenPadding
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  mark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  brandText: { fontSize: tokens.type.heading, fontWeight: tokens.weight.black },
  actions: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: tokens.space.sm },
  linkText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  cta: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.md
  },
  ctaText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold }
});
