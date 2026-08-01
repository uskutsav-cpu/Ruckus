import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const links = [
  { label: 'Guidelines', path: '/public/community-guidelines' },
  { label: 'Privacy', path: '/public/privacy' },
  { label: 'Terms', path: '/public/terms' },
  { label: 'Delete account', path: '/public/account-deletion' },
  { label: 'Partnerships', path: '/public/partnership' }
] as const;

export function PublicFooter() {
  const { theme } = useTheme();
  return (
    <View style={[styles.footer, { borderTopColor: theme.border }]}>
      <View style={styles.links}>
        {links.map((link) => (
          <Pressable
            key={link.path}
            accessibilityRole="link"
            onPress={() => router.push(link.path)}
            style={styles.link}
          >
            <Text style={[styles.linkText, { color: theme.textMuted }]}>
              {link.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.note, { color: theme.textSubtle }]}>
        Ruckus beta · 18+ · No university partnership or safety guarantee is implied.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: tokens.space.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.lg
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: tokens.space.sm },
  linkText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  note: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.micro,
    lineHeight: tokens.lineHeight.caption
  }
});
