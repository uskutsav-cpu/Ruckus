import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { StatusPill } from '@/components/ui/status-pill';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const dataPractices = [
  {
    title: 'University access',
    copy: 'Ruckus uses the configured university email domain to limit access. A matching domain is not proof of identity.'
  },
  {
    title: 'Profile and activity data',
    copy: 'Your profile, swipe decisions, crew membership, confirmations, reports, check-ins, ratings, and XP support the core experience.'
  },
  {
    title: 'Location boundary',
    copy: 'Ruckus does not collect live or background location. Venues come from campus-managed activity sessions.'
  },
  {
    title: 'Private safety context',
    copy: 'Reports are restricted to authorized campus reviewers. Blocking limits shared access and future matching.'
  },
  {
    title: 'Account deletion',
    copy: 'A deletion request disables social participation immediately and schedules the trusted purge after seven days.'
  }
] as const;

export default function LegalAndDataUseScreen() {
  const { theme } = useTheme();

  return (
    <AppScreen>
      <BackButton label="Settings" onPress={() => router.back()} />
      <StatusPill label="PRIVACY & DATA USE" tone="neutral" />
      <Text style={[styles.heading, { color: theme.text }]}>
        Designed with boundaries.
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        This plain-language product summary explains current app behavior. It is not a
        substitute for approved legal documents.
      </Text>

      <InlineNotice
        tone="error"
        message="Approved Terms of Use and Privacy Policy URLs are not configured. A deploying organization must supply them before release."
      />

      <View accessibilityRole="list" style={styles.list}>
        {dataPractices.map((item) => (
          <View
            key={item.title}
            accessibilityRole="text"
            style={[
              styles.card,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.copy, { color: theme.textMuted }]}>{item.copy}</Text>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
    letterSpacing: -1
  },
  subtitle: {
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.lg,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    fontWeight: tokens.weight.medium
  },
  list: { gap: tokens.space.sm },
  card: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md
  },
  title: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  copy: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  }
});
