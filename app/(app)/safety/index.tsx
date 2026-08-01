import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionRow } from '@/components/ui/action-row';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function SafetyCenterScreen() {
  const { theme } = useTheme();

  return (
    <AppScreen>
      <BackButton label="Settings" onPress={() => router.back()} />
      <StatusPill label="Safety center" tone="warning" />
      <Text style={[styles.title, { color: theme.text }]}>Plan for safety</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        University-email access narrows the community. It does not prove identity, so use
        the same judgment you would with any new group.
      </Text>

      <View
        style={[
          styles.foundation,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
        ]}
      >
        <Text style={[styles.foundationEyebrow, { color: theme.accent }]}>
          How Ruckus works
        </Text>
        <Text style={[styles.foundationTitle, { color: theme.text }]}>
          Public, group-based, and intentionally limited
        </Text>
        <Text style={[styles.foundationCopy, { color: theme.textMuted }]}>
          There are no direct messages, one-to-one matches, user-created activities, or
          live and background location collection. Approved public venue details stay
          hidden until the group confirms.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Get guidance</Text>
      <View style={styles.actions}>
        <ActionRow
          mark="warning"
          title="Emergency information"
          description="Leave first, get immediate help, and report only after you are safe."
          tone="danger"
          onPress={() => router.push('/safety/emergency')}
        />
        <ActionRow
          mark="rules"
          title="Community guidelines"
          description="The conduct expected in every group, chat, and public meetup."
          tone="accent"
          onPress={() => router.push('/safety/guidelines')}
        />
        <ActionRow
          mark="forward"
          title="Report from the source"
          description="Open the relevant group or message first so reviewers receive the right context."
          onPress={() => router.push('/groups')}
        />
      </View>

      <View
        style={[
          styles.reminder,
          { backgroundColor: tokens.color.coralSoft, borderColor: tokens.color.coral }
        ]}
      >
        <Text style={styles.reminderTitle}>Ruckus is not an emergency channel.</Text>
        <Text style={styles.reminderCopy}>
          Reports and chat may not be monitored in real time. Leave unsafe situations and
          contact local emergency services or your campus safety office.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.bold,
    letterSpacing: -1
  },
  subtitle: {
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.lg,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    fontWeight: tokens.weight.medium
  },
  foundation: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg
  },
  foundationEyebrow: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.bold
  },
  foundationTitle: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.heading,
    lineHeight: tokens.lineHeight.heading,
    fontWeight: tokens.weight.bold
  },
  foundationCopy: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.medium
  },
  sectionTitle: {
    marginTop: tokens.space.xl,
    marginBottom: tokens.space.md,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold
  },
  actions: { gap: tokens.space.sm },
  reminder: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.xl
  },
  reminderTitle: {
    color: '#7C2421',
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold
  },
  reminderCopy: {
    marginTop: tokens.space.xs,
    color: '#6F3430',
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  }
});
