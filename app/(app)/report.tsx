import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { submitReport } from '@/features/safety/safety-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const reasons = [
  {
    value: 'Harassment or bullying',
    detail: 'Threats, intimidation, unwanted contact, or targeted abuse.'
  },
  {
    value: 'Hate or discrimination',
    detail: 'Conduct targeting identity, background, disability, or protected traits.'
  },
  {
    value: 'Unsafe meetup behavior',
    detail: 'Pressure to change venues, unsafe conduct, or check-in misuse.'
  },
  {
    value: 'Spam or impersonation',
    detail: 'Misleading identity, solicitation, or disruptive content.'
  },
  {
    value: 'Something else',
    detail: 'A safety or conduct concern not covered above.'
  }
] as const;

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
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hasTarget = Boolean(messageId || userId || groupId);
  const targetLabel = messageId ? 'message' : userId ? 'student' : 'crew';

  const submit = async () => {
    if (!user || !hasTarget || !reason) return;
    setSubmitting(true);
    setError('');
    try {
      const outcome = await submitReport(
        {
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
        params: {
          demo: String(isDemo),
          blocked: String(outcome.userBlocked),
          blockFailed: String(outcome.blockFailed)
        }
      });
    } catch {
      setError(
        'Nothing was changed. The private report could not be submitted—check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasTarget) {
    return (
      <AppScreen>
        <BackButton label="Back" onPress={() => router.back()} />
        <StatusPill label="PRIVATE SAFETY REPORT" tone="warning" />
        <Text style={[styles.title, { color: theme.text }]}>
          Report link unavailable.
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Reports must start from the relevant crew, student, or message so reviewers
          receive the correct private context.
        </Text>
        <InlineNotice
          tone="error"
          message="No report target was included. Return to your crews and try again."
        />
        <PrimaryButton label="Back to crews" onPress={() => router.replace('/groups')} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BackButton
        label={reviewing ? 'Edit report' : 'Back'}
        onPress={() => {
          if (reviewing) setReviewing(false);
          else router.back();
        }}
      />
      <StatusPill
        label={isDemo ? 'DEMO REPORT · NOT SENT' : 'PRIVATE SAFETY REPORT'}
        tone={isDemo ? 'accent' : 'warning'}
      />
      <Text style={[styles.title, { color: theme.text }]}>
        {reviewing ? 'Review before sending.' : 'Tell the campus team.'}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {reviewing
          ? 'Confirm the category, written context, and blocking choice. Reports cannot be edited after submission.'
          : `This ${targetLabel} report is private and visible only to authorized campus reviewers.`}
      </Text>

      {isDemo ? (
        <InlineNotice message="This flow is a local preview. No report will be sent and no student will be blocked." />
      ) : null}

      {reviewing ? (
        <>
          <View
            style={[
              styles.reviewCard,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
            ]}
          >
            <ReviewRow label="Reporting" value={targetLabel} />
            <ReviewRow label="Category" value={reason} />
            <ReviewRow
              label="Written context"
              value={details.trim() || 'No additional context'}
            />
            {userId ? (
              <ReviewRow
                label="Block after report"
                value={blockUser ? 'Yes—remove shared access' : 'No'}
              />
            ) : null}
          </View>
          <InlineNotice message="Submitting a report does not notify the reported person. If you also block them, shared active groups and future matching are removed immediately." />
          <PrimaryButton
            label={isDemo ? 'Preview submission' : 'Submit private report'}
            loading={submitting}
            onPress={() => void submit()}
            style={styles.submit}
          />
          <PrimaryButton
            label="Make changes"
            variant="secondary"
            onPress={() => setReviewing(false)}
            style={styles.secondary}
          />
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: theme.text }]}>
            What best describes the issue?
          </Text>
          <View accessibilityRole="radiogroup" style={styles.reasons}>
            {reasons.map((option) => {
              const active = reason === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.value}
                  accessibilityHint={option.detail}
                  accessibilityState={{ selected: active }}
                  onPress={() => setReason(option.value)}
                  style={[
                    styles.reason,
                    {
                      backgroundColor: active ? theme.accentMuted : theme.surfaceElevated,
                      borderColor: active ? theme.accent : theme.border
                    }
                  ]}
                >
                  <View style={styles.reasonCopy}>
                    <Text style={[styles.reasonText, { color: theme.text }]}>
                      {option.value}
                    </Text>
                    <Text style={[styles.reasonDetail, { color: theme.textMuted }]}>
                      {option.detail}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: active ? theme.accent : theme.textSubtle,
                        backgroundColor: active ? theme.accent : 'transparent'
                      }
                    ]}
                  >
                    {active ? <View style={styles.radioCenter} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <TextField
            label="Optional written context"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={2000}
            help={`${details.length}/2000 · avoid adding sensitive personal information`}
            style={styles.details}
          />
          {userId ? (
            <View
              style={[
                styles.block,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
              ]}
            >
              <View style={styles.blockCopy}>
                <Text style={[styles.blockTitle, { color: theme.text }]}>
                  Block this student after reporting
                </Text>
                <Text style={[styles.blockHelp, { color: theme.textMuted }]}>
                  You’ll leave shared active crews and waitlists. Future matching, member
                  cards, avatar access, and rankings exclude both of you.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Block this student after reporting"
                value={blockUser}
                onValueChange={setBlockUser}
                trackColor={{ false: theme.surfaceStrong, true: theme.accent }}
                thumbColor={blockUser ? tokens.color.white : theme.surfaceElevated}
              />
            </View>
          ) : null}
          {error ? <InlineNotice tone="error" icon="!" message={error} /> : null}
          <PrimaryButton
            label="Review report"
            disabled={!reason}
            onPress={() => {
              setError('');
              setReviewing(true);
            }}
            style={styles.submit}
          />
          <PrimaryButton label="Cancel" variant="ghost" onPress={() => router.back()} />
        </>
      )}

      <View
        style={[
          styles.urgent,
          { backgroundColor: tokens.color.coralSoft, borderColor: tokens.color.coral }
        ]}
      >
        <Text style={styles.urgentTitle}>An in-app report is not emergency help.</Text>
        <Text style={styles.urgentText}>
          Leave immediate danger first and contact local emergency services or your campus
          safety office.
        </Text>
      </View>
    </AppScreen>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
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
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.black },
  reasons: { gap: tokens.space.sm, marginTop: tokens.space.md },
  reason: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md
  },
  reasonCopy: { flex: 1, paddingRight: tokens.space.md },
  reasonText: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  reasonDetail: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  radio: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: tokens.radius.pill
  },
  radioCenter: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.white
  },
  details: {
    minHeight: 144,
    paddingTop: tokens.space.md,
    textAlignVertical: 'top'
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    marginTop: tokens.space.lg
  },
  blockCopy: { flex: 1 },
  blockTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  blockHelp: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.space.lg
  },
  reviewRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.28)',
    paddingVertical: tokens.space.md
  },
  reviewLabel: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.black,
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  reviewValue: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.heavy,
    textTransform: 'capitalize'
  },
  submit: { marginTop: tokens.space.lg },
  secondary: { marginTop: tokens.space.sm },
  urgent: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    marginTop: tokens.space.xl
  },
  urgentTitle: {
    color: '#7C2421',
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.black
  },
  urgentText: {
    marginTop: tokens.space.xs,
    color: '#6F3430',
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  }
});
