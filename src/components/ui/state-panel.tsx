import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export type StatePanelProps = {
  icon?: string;
  eyebrow?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatePanel({
  icon = 'info',
  eyebrow,
  title,
  message,
  actionLabel,
  onAction
}: StatePanelProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.surfaceMuted }]}>
        <AppIcon color={theme.textMuted} name={icon} size={34} />
      </View>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme.textMuted }]}>{eyebrow}</Text>
      ) : null}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
      {actionLabel && onAction ? (
        <SecondaryButton label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.xxl
  },
  iconWrap: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md
  },
  eyebrow: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  title: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.heading,
    lineHeight: tokens.lineHeight.heading,
    fontWeight: tokens.weight.bold,
    letterSpacing: -0.4,
    textAlign: 'center'
  },
  message: {
    marginTop: tokens.space.sm,
    maxWidth: 330,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.regular,
    textAlign: 'center'
  },
  button: { minWidth: 200, marginTop: tokens.space.lg }
});
