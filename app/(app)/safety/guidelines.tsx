import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const guidelines = [
  ['Respect the crew', 'No harassment, hate, threats, pressure, or sexual misconduct.'],
  [
    'Keep it public and group-based',
    'Meet only at the lobby venue. Do not redirect members to a home or isolated location.'
  ],
  [
    'Protect privacy',
    'Do not share someone else’s messages, QR code, contact details, or personal information.'
  ],
  [
    'Be reliable',
    'Confirm honestly, cancel as early as possible, and check in only when physically present.'
  ],
  [
    'Use chat for the activity',
    'No spam, commercial solicitation, impersonation, or attempts to turn the group into one-to-one messaging.'
  ],
  [
    'Speak up',
    'Leave unsafe situations. Report concerning users, messages, or groups after you are safe.'
  ]
] as const;

export default function CommunityGuidelinesScreen() {
  const { theme } = useTheme();
  return (
    <AppScreen
      eyebrow="Community guidelines"
      title="Make room for a great crew"
      subtitle="These rules apply in the app, group chat, and at every Campus Clash activity."
    >
      <View style={styles.guidelines}>
        {guidelines.map(([title, copy], index) => (
          <View
            key={title}
            style={[
              styles.guideline,
              { backgroundColor: theme.surface, borderColor: theme.border }
            ]}
          >
            <Text style={[styles.index, { color: theme.primary }]}>
              {(index + 1).toString().padStart(2, '0')}
            </Text>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.description, { color: theme.textMuted }]}>{copy}</Text>
            </View>
          </View>
        ))}
      </View>
      <PrimaryButton
        label="Back to safety center"
        variant="secondary"
        onPress={() => router.back()}
        style={styles.back}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  guidelines: { gap: tokens.space.sm },
  guideline: {
    flexDirection: 'row',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  index: { fontSize: 16, fontWeight: '900' },
  copy: { flex: 1 },
  title: { fontSize: 15, fontWeight: '900' },
  description: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  back: { marginTop: tokens.space.lg }
});
