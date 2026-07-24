import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { requestAccountDeletion } from '@/features/safety/safety-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const impacts = [
  {
    title: 'Immediately after the request',
    copy: 'Push tokens are disabled, waitlists are withdrawn, pending attendance is declined, and active crew membership ends.'
  },
  {
    title: 'During the seven-day window',
    copy: 'Social participation stays disabled. Contact verified campus support before the purge only if the request was a mistake.'
  },
  {
    title: 'After seven days',
    copy: 'The scheduled trusted purge deletes the Auth user, avatar, and profile-owned data. Retained crew messages become anonymous.'
  }
] as const;

export default function AccountDeletionScreen() {
  const { isDemo, signOut } = useAuth();
  const { theme } = useTheme();
  const network = useNetInfo();
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoComplete, setDemoComplete] = useState(false);
  const [requestScheduled, setRequestScheduled] = useState(false);
  const [error, setError] = useState('');
  const confirmed = confirmation.trim().toUpperCase() === 'DELETE';

  const finishSignOut = async () => {
    setSubmitting(true);
    setError('');
    try {
      await signOut();
      router.replace('/account-deletion-confirmed');
    } catch {
      setError(
        'Deletion is scheduled, but sign-out did not finish. Reconnect and try signing out again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestDeletion = async () => {
    if (!confirmed || network.isConnected === false) return;
    setSubmitting(true);
    setError('');
    try {
      await requestAccountDeletion(isDemo);
    } catch {
      setError(
        'Your account was not changed. The deletion request could not be verified—check your connection and try again.'
      );
      setSubmitting(false);
      return;
    }

    if (isDemo) {
      setDemoComplete(true);
      setSubmitting(false);
      return;
    }

    setRequestScheduled(true);
    try {
      await signOut();
      router.replace('/account-deletion-confirmed');
    } catch {
      setError(
        'Deletion is scheduled, but sign-out did not finish. Reconnect and try signing out again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (demoComplete) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.complete}>
          <StatusPill label="DEMO RESULT · NOT REQUESTED" tone="accent" />
          <View style={[styles.completeMark, { backgroundColor: theme.accentMuted }]}>
            <Text style={[styles.completeMarkText, { color: theme.accent }]}>i</Text>
          </View>
          <Text style={[styles.completeTitle, { color: theme.text }]}>
            Deletion preview complete
          </Text>
          <Text style={[styles.completeCopy, { color: theme.textMuted }]}>
            No account was changed and no deletion was scheduled. Connected mode uses the
            trusted seven-day server workflow.
          </Text>
          <PrimaryButton
            label="Back to settings"
            onPress={() => router.replace('/settings')}
            style={styles.completeButton}
          />
        </View>
      </AppScreen>
    );
  }

  if (requestScheduled) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.complete}>
          <StatusPill label="DELETION SCHEDULED" tone="warning" />
          <View
            style={[
              styles.completeMark,
              {
                backgroundColor: tokens.color.coralSoft,
                borderColor: tokens.color.coral,
                borderWidth: 1
              }
            ]}
          >
            <Text style={[styles.completeMarkText, { color: '#7C2421' }]}>!</Text>
          </View>
          <Text style={[styles.completeTitle, { color: theme.text }]}>
            Finish signing out.
          </Text>
          <Text style={[styles.completeCopy, { color: theme.textMuted }]}>
            The deletion request succeeded and social participation is disabled. Sign out
            must finish before this device leaves the account.
          </Text>
          {network.isConnected === false ? (
            <InlineNotice
              tone="offline"
              message="Reconnect to finish the secure sign-out."
            />
          ) : null}
          {error ? <InlineNotice tone="error" message={error} /> : null}
          <PrimaryButton
            label="Finish signing out"
            loading={submitting}
            disabled={network.isConnected === false}
            onPress={() => void finishSignOut()}
            style={styles.completeButton}
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BackButton label="Settings" onPress={() => router.back()} />
      <StatusPill
        label={isDemo ? 'DEMO DELETION · NO ACCOUNT CHANGE' : 'ACCOUNT DELETION'}
        tone={isDemo ? 'accent' : 'warning'}
      />
      <Text style={[styles.heading, { color: theme.text }]}>
        A deliberate seven-day process.
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Review each consequence before submitting. Ruckus does not hide the action or
        pressure you to keep your account.
      </Text>

      {network.isConnected === false ? (
        <InlineNotice
          tone="offline"
          icon="↯"
          message="Reconnect before requesting deletion. This action cannot be queued offline."
        />
      ) : null}
      {isDemo ? (
        <InlineNotice message="This is a local preview. The confirmation below will not request or schedule deletion." />
      ) : null}

      <View accessibilityRole="list" style={styles.impacts}>
        {impacts.map((impact, index) => (
          <View
            key={impact.title}
            accessibilityRole="text"
            style={[
              styles.impact,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
            ]}
          >
            <View style={[styles.number, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.numberText, { color: theme.text }]}>{index + 1}</Text>
            </View>
            <View style={styles.impactCopy}>
              <Text style={[styles.impactTitle, { color: theme.text }]}>
                {impact.title}
              </Text>
              <Text style={[styles.impactDescription, { color: theme.textMuted }]}>
                {impact.copy}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.confirmCard,
          { backgroundColor: tokens.color.coralSoft, borderColor: tokens.color.coral }
        ]}
      >
        <Text style={styles.confirmTitle}>Type DELETE to confirm</Text>
        <Text style={styles.confirmCopy}>
          This prevents an accidental tap. You can still leave this screen without making
          any change.
        </Text>
        <TextField
          label="Confirmation"
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
        />
      </View>

      {error ? <InlineNotice tone="error" icon="!" message={error} /> : null}
      <PrimaryButton
        label={isDemo ? 'Preview deletion request' : 'Request account deletion'}
        variant="danger"
        loading={submitting}
        disabled={!confirmed || network.isConnected === false}
        onPress={() => void requestDeletion()}
        style={styles.submit}
      />
      <PrimaryButton
        label="Keep my account"
        variant="secondary"
        onPress={() => router.back()}
        style={styles.keep}
      />
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
  impacts: { gap: tokens.space.sm },
  impact: {
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
  impactCopy: { flex: 1, marginLeft: tokens.space.md },
  impactTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  impactDescription: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  confirmCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    marginTop: tokens.space.xl
  },
  confirmTitle: {
    color: '#7C2421',
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.black
  },
  confirmCopy: {
    marginTop: tokens.space.xs,
    color: '#6F3430',
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  submit: { marginTop: tokens.space.lg },
  keep: { marginTop: tokens.space.sm },
  complete: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  completeMark: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 43,
    marginTop: tokens.space.lg
  },
  completeMarkText: { fontSize: 48, fontWeight: tokens.weight.black },
  completeTitle: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
    textAlign: 'center'
  },
  completeCopy: {
    maxWidth: 350,
    marginTop: tokens.space.sm,
    fontSize: tokens.type.label,
    lineHeight: 22,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  },
  completeButton: { minWidth: 240, marginTop: tokens.space.xl }
});
