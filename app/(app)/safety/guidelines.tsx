import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { StatusPill } from '@/components/ui/status-pill';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const guidelines = [
  ['Respect the crew', 'No harassment, hate, threats, pressure, or sexual misconduct.'],
  [
    'Keep it public and group-based',
    'Meet only at the lobby venue. Never redirect members to a home or isolated location.'
  ],
  [
    'Protect privacy',
    'Do not share another person’s messages, QR code, contact details, photo, or personal information.'
  ],
  [
    'Be reliable',
    'Confirm honestly, cancel as early as possible, and check in only when physically present.'
  ],
  [
    'Keep chat activity-specific',
    'No spam, solicitation, impersonation, or attempts to turn the crew into one-to-one messaging.'
  ],
  [
    'Speak up safely',
    'Leave concerning situations first. Report a student, message, or crew after you are safe.'
  ]
] as const;

export default function CommunityGuidelinesScreen() {
  const { theme } = useTheme();

  return (
    <AppScreen>
      <BackButton label="Safety center" onPress={() => router.back()} />
      <StatusPill label="COMMUNITY GUIDELINES" tone="warning" />
      <Text style={[styles.heading, { color: theme.text }]}>
        Make room for a safe crew.
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        These expectations apply in Ruckus, group chat, and at every activity. Campus
        teams may review reports and enforce access rules.
      </Text>

      <View accessibilityRole="list" style={styles.guidelines}>
        {guidelines.map(([title, copy], index) => (
          <View
            key={title}
            accessibilityRole="text"
            style={[
              styles.guideline,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
            ]}
          >
            <View style={[styles.index, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.indexText, { color: theme.text }]}>
                {(index + 1).toString().padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.description, { color: theme.textMuted }]}>{copy}</Text>
            </View>
          </View>
        ))}
      </View>
      <InlineNotice message="Blocking removes shared active access and future matching. Reporting privately sends context to authorized campus reviewers." />
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
  guidelines: { gap: tokens.space.sm },
  guideline: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md
  },
  index: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  indexText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.black },
  copy: { flex: 1, marginLeft: tokens.space.md },
  title: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  description: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  }
});
