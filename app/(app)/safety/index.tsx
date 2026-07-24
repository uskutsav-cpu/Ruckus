import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const safetyActions = [
  {
    icon: '🚨',
    title: 'Emergency information',
    copy: 'What to do if you or someone else may be in immediate danger.',
    route: '/safety/emergency'
  },
  {
    icon: '🤝',
    title: 'Community guidelines',
    copy: 'The behavior expected in every Campus Clash crew and public meetup.',
    route: '/safety/guidelines'
  },
  {
    icon: '🛡️',
    title: 'Report a group',
    copy: 'Open a private safety report from the relevant lobby or message.',
    route: '/groups'
  }
] as const;

export default function SafetyCenterScreen() {
  const { theme } = useTheme();
  return (
    <AppScreen
      eyebrow="Safety center"
      title="Your safety comes first"
      subtitle="Campus Clash verifies access to one university email domain. That is not proof of identity—use the same care you would with any new group."
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={[styles.back, { backgroundColor: theme.surfaceMuted }]}
      >
        <Text style={[styles.backText, { color: theme.text }]}>← Settings</Text>
      </Pressable>
      <View style={[styles.foundation, { backgroundColor: theme.surface }]}>
        <Text style={[styles.foundationTitle, { color: theme.text }]}>
          Built around public group activities
        </Text>
        <Text style={[styles.foundationCopy, { color: theme.textMuted }]}>
          There are no direct messages, no one-to-one matching, no user-created
          activities, and no live or background location collection. Meeting spots are
          approved public, staffed venues and stay locked until the crew confirms.
        </Text>
      </View>
      <View style={styles.actions}>
        {safetyActions.map((action) => (
          <Pressable
            key={action.title}
            accessibilityRole="button"
            onPress={() => router.push(action.route)}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1
              }
            ]}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <View style={styles.actionCopy}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>
                {action.title}
              </Text>
              <Text style={[styles.actionDescription, { color: theme.textMuted }]}>
                {action.copy}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.reminder, { color: theme.textMuted }]}>
        An in-app report is not an emergency channel. If a situation feels unsafe, leave
        first and get help.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  back: {
    minHeight: tokens.touchTarget,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    marginBottom: tokens.space.lg
  },
  backText: { fontSize: 13, fontWeight: '800' },
  foundation: { borderRadius: tokens.radius.lg, padding: tokens.space.lg },
  foundationTitle: { fontSize: 18, fontWeight: '900' },
  foundationCopy: { marginTop: 7, fontSize: 13, lineHeight: 20 },
  actions: { gap: tokens.space.sm, marginTop: tokens.space.lg },
  action: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  actionIcon: { fontSize: 28 },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '900' },
  actionDescription: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  chevron: { fontSize: 28, fontWeight: '500' },
  reminder: { marginTop: tokens.space.lg, fontSize: 12, lineHeight: 18 }
});
