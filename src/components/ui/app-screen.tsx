import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle
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
  contentStyle?: ViewStyle;
}>;

export function AppScreen({
  children,
  title,
  eyebrow,
  subtitle,
  footer,
  scroll = true,
  contentStyle
}: AppScreenProps) {
  const { theme } = useTheme();
  const content = (
    <View style={[styles.content, contentStyle]}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text>
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
        keyboardVerticalOffset={8}
        style={styles.flex}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
            <View style={styles.footerInner}>{footer}</View>
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
    width: '100%',
    maxWidth: tokens.layout.maxContentWidth,
    flexGrow: 1,
    alignSelf: 'center',
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xxl
  },
  eyebrow: {
    marginBottom: tokens.space.sm,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black,
    letterSpacing: 1.35,
    textTransform: 'uppercase'
  },
  title: {
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
    letterSpacing: -1.15
  },
  subtitle: {
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.lg,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    fontWeight: tokens.weight.medium
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.sm
  },
  footerInner: {
    width: '100%',
    maxWidth: tokens.layout.maxContentWidth,
    alignSelf: 'center'
  }
});
