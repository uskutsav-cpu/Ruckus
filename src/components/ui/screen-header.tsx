import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
};

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  action,
  compact = false
}: ScreenHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, compact && styles.compact]}>
      <View style={styles.copy}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text>
        ) : null}
        <Text
          style={[compact ? styles.compactTitle : styles.title, { color: theme.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: tokens.space.lg
  },
  compact: { alignItems: 'center', marginBottom: tokens.space.md },
  copy: { flex: 1 },
  eyebrow: {
    marginBottom: 6,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black,
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  title: {
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
    letterSpacing: -1.1
  },
  compactTitle: {
    fontSize: tokens.type.heading,
    lineHeight: tokens.lineHeight.heading,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.65
  },
  subtitle: {
    marginTop: 6,
    fontSize: tokens.type.label,
    lineHeight: 20,
    fontWeight: tokens.weight.medium
  },
  action: { marginLeft: tokens.space.md }
});
