import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type InlineNoticeProps = {
  message: string;
  tone?: 'error' | 'info' | 'offline' | 'success';
  icon?: string;
};

export function InlineNotice({ message, tone = 'info', icon }: InlineNoticeProps) {
  const { theme } = useTheme();
  const backgroundColor =
    tone === 'error'
      ? tokens.color.coralSoft
      : tone === 'offline'
        ? theme.offline
        : tone === 'success'
          ? theme.accentMuted
          : theme.surfaceMuted;
  const color =
    tone === 'error'
      ? '#8B2522'
      : tone === 'offline'
        ? '#FFF0B7'
        : tone === 'success'
          ? theme.success
          : theme.textMuted;

  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor }]}>
      {icon ? (
        <View style={styles.icon}>
          <AppIcon color={color} name={icon} size={17} />
        </View>
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
  icon: { marginRight: tokens.space.sm },
  copy: {
    flex: 1,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.regular
  }
});
