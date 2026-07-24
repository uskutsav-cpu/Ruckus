import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function EmergencyInformationScreen() {
  const { theme } = useTheme();
  return (
    <AppScreen
      eyebrow="Safety center"
      title="If something feels unsafe"
      subtitle="Trust your instincts. You never owe a group your continued presence."
    >
      <View style={styles.steps}>
        <EmergencyStep
          number="1"
          title="Leave the situation"
          copy="Move to a visible, staffed public place. Do not stay to preserve the activity or your XP."
        />
        <EmergencyStep
          number="2"
          title="Get immediate help"
          copy="For imminent danger or a medical emergency, contact local emergency services. For campus-specific support, use the official number published by your university."
        />
        <EmergencyStep
          number="3"
          title="Tell someone you trust"
          copy="Contact a friend, roommate, residence staff member, or campus support professional."
        />
        <EmergencyStep
          number="4"
          title="Report in Ruckus afterward"
          copy="When you are safe, report the member, message, or group from its lobby. Reports go only to authorized campus reviewers."
        />
      </View>
      <View style={[styles.notice, { borderColor: theme.danger }]}>
        <Text style={[styles.noticeTitle, { color: theme.danger }]}>
          Ruckus cannot dispatch emergency responders
        </Text>
        <Text style={[styles.noticeCopy, { color: theme.textMuted }]}>
          Chat and report tools may not be monitored in real time. Do not wait for an
          in-app response during an emergency.
        </Text>
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

function EmergencyStep({
  number,
  title,
  copy
}: {
  number: string;
  title: string;
  copy: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.number, { backgroundColor: theme.primary }]}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <View style={styles.stepCopy}>
        <Text style={[styles.stepTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.stepDescription, { color: theme.textMuted }]}>{copy}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { gap: tokens.space.lg },
  step: { flexDirection: 'row', gap: tokens.space.md },
  number: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14
  },
  numberText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  stepCopy: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '900' },
  stepDescription: { marginTop: 4, fontSize: 13, lineHeight: 20 },
  notice: {
    borderWidth: 2,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    marginTop: tokens.space.xl
  },
  noticeTitle: { fontSize: 15, fontWeight: '900' },
  noticeCopy: { marginTop: 5, fontSize: 12, lineHeight: 18 },
  back: { marginTop: tokens.space.lg }
});
