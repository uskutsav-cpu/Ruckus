import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { AppScreen } from '@/components/ui/app-screen';
import { InlineNotice } from '@/components/ui/inline-notice';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export function PublicDocument({
  eyebrow,
  title,
  subtitle,
  legalDraft = false,
  children
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  legalDraft?: boolean;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <AppScreen contentStyle={styles.screen}>
      <PublicHeader />
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: theme.textMuted }]}>{eyebrow}</Text>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        {legalDraft ? (
          <InlineNotice
            tone="error"
            icon="warning"
            message="Draft for product readiness only. This text requires review and approval by qualified legal counsel before production publication."
          />
        ) : null}
        <View style={styles.body}>{children}</View>
      </View>
      <PublicFooter />
    </AppScreen>
  );
}

export function DocumentSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.paragraph, { color: theme.textMuted }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  content: { paddingTop: 48 },
  eyebrow: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  title: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.hero,
    lineHeight: tokens.lineHeight.hero,
    fontWeight: tokens.weight.black
  },
  subtitle: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.heading,
    lineHeight: 31
  },
  body: { marginTop: tokens.space.lg },
  section: { marginTop: tokens.space.xl },
  sectionTitle: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  paragraph: { marginTop: tokens.space.sm, fontSize: tokens.type.body, lineHeight: 26 }
});
