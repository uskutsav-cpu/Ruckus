import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const steps = [
  {
    title: 'Leave the situation',
    copy: 'Move to a visible, staffed public place. Do not stay to preserve the activity or your XP.'
  },
  {
    title: 'Get immediate help',
    copy: 'For imminent danger or a medical emergency, contact local emergency services. Use the official campus safety contact published by your university for campus-specific help.'
  },
  {
    title: 'Tell someone you trust',
    copy: 'Contact a friend, roommate, residence staff member, or campus support professional.'
  },
  {
    title: 'Preserve useful context',
    copy: 'When safe, keep relevant crew or message context available. Do not confront anyone to gather evidence.'
  },
  {
    title: 'Report in Ruckus afterward',
    copy: 'Start from the relevant student, message, or crew. Reports go only to authorized campus reviewers.'
  }
] as const;

export default function EmergencyInformationScreen() {
  const { theme } = useTheme();

  return (
    <AppScreen>
      <BackButton label="Safety center" onPress={() => router.back()} />
      <StatusPill label="URGENT SAFETY GUIDANCE" tone="warning" />
      <Text style={[styles.heading, { color: theme.text }]}>
        If something feels unsafe, leave.
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Trust your instincts. You never owe a crew your continued presence, and leaving
        does not require permission from a host.
      </Text>

      <View
        style={[
          styles.notice,
          { backgroundColor: tokens.color.coralSoft, borderColor: tokens.color.coral }
        ]}
      >
        <Text style={styles.noticeTitle}>
          Ruckus cannot dispatch emergency responders.
        </Text>
        <Text style={styles.noticeCopy}>
          Chat and reports may not be monitored in real time. Do not wait for an in-app
          response during an emergency.
        </Text>
      </View>

      <View accessibilityRole="list" style={styles.steps}>
        {steps.map((step, index) => (
          <View
            key={step.title}
            accessibilityRole="text"
            style={[
              styles.step,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
            ]}
          >
            <View style={[styles.number, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.numberText, { color: theme.text }]}>{index + 1}</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
              <Text style={[styles.stepDescription, { color: theme.textMuted }]}>
                {step.copy}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.privacy, { color: theme.textMuted }]}>
        Ruckus does not collect live or background location. Share your location only
        through a trusted method you control.
      </Text>
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
  notice: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md
  },
  noticeTitle: {
    color: '#7C2421',
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.black
  },
  noticeCopy: {
    marginTop: tokens.space.xs,
    color: '#6F3430',
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  steps: { gap: tokens.space.sm, marginTop: tokens.space.lg },
  step: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md
  },
  number: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  numberText: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  stepCopy: { flex: 1, marginLeft: tokens.space.md },
  stepTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  stepDescription: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  privacy: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  }
});
