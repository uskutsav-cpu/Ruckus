import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type AppScreenProps = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  footer?: ReactNode;
  scroll?: boolean;
}>;

export function AppScreen({
  children,
  title,
  eyebrow,
  subtitle,
  footer,
  scroll = true
}: AppScreenProps) {
  const { theme } = useTheme();
  const content = (
    <View style={styles.content}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text>
      ) : null}
      {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
        {footer ? (
          <View
            style={[
              styles.footer,
              { backgroundColor: theme.background, borderTopColor: theme.border }
            ]}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xxl
  },
  eyebrow: {
    marginBottom: tokens.space.sm,
    fontSize: tokens.type.caption,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase'
  },
  title: {
    fontSize: tokens.type.title,
    fontWeight: '900',
    letterSpacing: -0.8
  },
  subtitle: {
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.lg,
    fontSize: tokens.type.body,
    lineHeight: 24
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: tokens.space.md
  }
});
