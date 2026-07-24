import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type InlineNoticeProps = {
  message: string;
  tone?: 'error' | 'info' | 'offline';
  icon?: string;
};

export function InlineNotice({ message, tone = 'info', icon }: InlineNoticeProps) {
  const { theme } = useTheme();
  const backgroundColor =
    tone === 'error'
      ? tokens.color.coralSoft
      : tone === 'offline'
        ? theme.offline
        : theme.surfaceMuted;
  const color =
    tone === 'error' ? '#8B2522' : tone === 'offline' ? '#FFF0B7' : theme.textMuted;

  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor }]}>
      {icon ? (
        <Text aria-hidden style={styles.icon}>
          {icon}
        </Text>
      ) : null}
      <Text style={[styles.copy, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: tokens.space.md
  },
  icon: { marginRight: tokens.space.sm, fontSize: 16 },
  copy: {
    flex: 1,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.heavy
  }
});
