import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { submitReport } from '@/features/safety/safety-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const reasons = [
  'Harassment or bullying',
  'Hate or discrimination',
  'Unsafe meetup behavior',
  'Spam or impersonation',
  'Something else'
];

export default function ReportScreen() {
  const params = useLocalSearchParams<{
    messageId?: string;
    userId?: string;
    groupId?: string;
  }>();
  const messageId = Array.isArray(params.messageId)
    ? params.messageId[0]
    : params.messageId;
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const { isDemo, user } = useAuth();
  const { theme } = useTheme();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [blockUser, setBlockUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hasTarget = Boolean(messageId || userId || groupId);

  const submit = async () => {
    if (!user || !hasTarget || !reason) return;
    setSubmitting(true);
    setError('');
    try {
      await submitReport(
        {
          reporterId: user.id,
          messageId,
          userId,
          groupId: messageId || userId ? undefined : groupId,
          reason,
          details,
          blockUser
        },
        isDemo
      );
      router.replace({
        pathname: '/report-result',
        params: { blocked: String(blockUser && Boolean(userId)) }
      });
    } catch {
      setError('The report could not be submitted. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen
      eyebrow="Safety report"
      title="Tell the campus team"
      subtitle="Reports are private, reviewed by authorized campus staff, and never shown to the person or group you report."
    >
      {hasTarget ? (
        <>
          <Text style={[styles.label, { color: theme.text }]}>
            What best describes the issue?
          </Text>
          <View style={styles.reasons}>
            {reasons.map((option) => {
              const active = reason === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setReason(option)}
                  style={[
                    styles.reason,
                    {
                      backgroundColor: active ? `${theme.primary}1A` : theme.surface,
                      borderColor: active ? theme.primary : theme.border
                    }
                  ]}
                >
                  <Text style={[styles.reasonText, { color: theme.text }]}>{option}</Text>
                  <Text style={{ color: active ? theme.primary : theme.textMuted }}>
                    {active ? '●' : '○'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextField
            label="Details (optional)"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={2000}
            help={`${details.length}/2000 · avoid adding sensitive personal information`}
            style={styles.details}
          />
          {userId ? (
            <View style={[styles.block, { backgroundColor: theme.surfaceMuted }]}>
              <View style={styles.blockCopy}>
                <Text style={[styles.blockTitle, { color: theme.text }]}>
                  Block this person too
                </Text>
                <Text style={[styles.blockHelp, { color: theme.textMuted }]}>
                  You’ll leave shared active groups and waitlists. Future matching, lobby
                  cards, avatar access, and rankings exclude both of you.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Block this person"
                value={blockUser}
                onValueChange={setBlockUser}
                trackColor={{ true: theme.primary }}
              />
            </View>
          ) : null}
          <PrimaryButton
            label="Submit private report"
            loading={submitting}
            disabled={!reason}
            onPress={() => void submit()}
            style={styles.submit}
          />
          <PrimaryButton label="Cancel" variant="ghost" onPress={() => router.back()} />
          {error ? (
            <Text
              accessibilityRole="alert"
              style={[styles.error, { color: theme.danger }]}
            >
              {error}
            </Text>
          ) : null}
        </>
      ) : (
        <View>
          <Text style={[styles.error, { color: theme.danger }]}>
            This report link is invalid. Return to the group and try again.
          </Text>
          <PrimaryButton
            label="Back to groups"
            onPress={() => router.replace('/groups')}
            style={styles.submit}
          />
        </View>
      )}
      <View style={[styles.urgent, { borderColor: theme.border }]}>
        <Text style={[styles.urgentTitle, { color: theme.text }]}>
          Immediate danger or emergency?
        </Text>
        <Text style={[styles.urgentText, { color: theme.textMuted }]}>
          Leave the situation and contact local emergency services or your campus safety
          office. An in-app report is not an emergency channel.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: '900' },
  reasons: { gap: tokens.space.sm, marginTop: tokens.space.md },
  reason: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md
  },
  reasonText: { fontSize: 14, fontWeight: '800' },
  details: { minHeight: 130, paddingTop: tokens.space.md, textAlignVertical: 'top' },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.lg
  },
  blockCopy: { flex: 1 },
  blockTitle: { fontSize: 14, fontWeight: '900' },
  blockHelp: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  submit: { marginTop: tokens.space.lg },
  error: { marginTop: tokens.space.md, fontSize: 13, lineHeight: 19 },
  urgent: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.xl
  },
  urgentTitle: { fontSize: 14, fontWeight: '900' },
  urgentText: { marginTop: 5, fontSize: 12, lineHeight: 18 }
});
