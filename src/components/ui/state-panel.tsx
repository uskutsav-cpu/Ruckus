import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type StatePanelProps = {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatePanel({
  icon,
  title,
  message,
  actionLabel,
  onAction
}: StatePanelProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.xl
  },
  icon: { fontSize: 52 },
  title: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.heading,
    fontWeight: '900',
    textAlign: 'center'
  },
  message: {
    marginTop: tokens.space.sm,
    maxWidth: 330,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  button: { minWidth: 180, marginTop: tokens.space.lg }
});
