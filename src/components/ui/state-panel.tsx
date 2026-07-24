import { StyleSheet, Text, View } from 'react-native';

import { SecondaryButton } from '@/components/ui/secondary-button';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export type StatePanelProps = {
  icon: string;
  eyebrow?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatePanel({
  icon,
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
        <Text style={styles.icon}>{icon}</Text>
      </View>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text>
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
    borderRadius: tokens.radius.lg,
    transform: [{ rotate: '-4deg' }]
  },
  icon: { fontSize: 38 },
  eyebrow: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black,
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  title: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.heading,
    lineHeight: tokens.lineHeight.heading,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.6,
    textAlign: 'center'
  },
  message: {
    marginTop: tokens.space.sm,
    maxWidth: 330,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  },
  button: { minWidth: 200, marginTop: tokens.space.lg }
});
