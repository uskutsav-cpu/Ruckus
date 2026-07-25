import { addDays, format } from 'date-fns';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function AccountPendingDeletionScreen() {
  const { profile, signOut } = useAuth();
  const { theme } = useTheme();
  const requestedAt = profile?.deletion_requested_at
    ? new Date(profile.deletion_requested_at)
    : null;
  const eligibleDate =
    requestedAt && !Number.isNaN(requestedAt.getTime())
      ? format(addDays(requestedAt, 7), 'MMMM d, yyyy')
      : 'seven days after the request';

  return (
    <AppScreen scroll={false}>
      <View style={styles.content}>
        <StatusPill label="Deletion scheduled" tone="warning" />
        <View
          style={[
            styles.mark,
            { backgroundColor: tokens.color.coralSoft, borderColor: tokens.color.coral }
          ]}
        >
          <Text style={styles.markLabel}>Purge window</Text>
          <Text style={styles.markText}>7 days</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          Account deletion requested
        </Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          Social participation and push tokens are disabled. The account becomes eligible
          for the scheduled trusted purge on {eligibleDate}.
        </Text>
        <View
          style={[
            styles.details,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
          ]}
        >
          <DeletionRow
            label="Already disabled"
            value="Waitlists, active groups, pending attendance, and push tokens"
          />
          <DeletionRow
            label="Scheduled deletion"
            value="Auth account, avatar, and profile-owned data"
          />
          <DeletionRow
            label="Retained context"
            value="Group messages remain without your identity"
          />
        </View>
        <InlineNotice message="There is no in-app cancel control. If the request was a mistake, use the verified campus support channel before the seven-day window ends. No support contact is configured in this build." />
        <PrimaryButton
          label="Sign out"
          onPress={() => void signOut()}
          style={styles.button}
        />
      </View>
    </AppScreen>
  );
}

function DeletionRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: {
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.lg
  },
  markText: {
    color: '#7C2421',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: tokens.weight.bold
  },
  markLabel: {
    color: '#7C2421',
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.bold,
    textAlign: 'center'
  },
  copy: {
    maxWidth: 380,
    marginTop: tokens.space.sm,
    fontSize: tokens.type.label,
    lineHeight: 22,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  },
  details: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    marginTop: tokens.space.lg
  },
  row: {
    paddingVertical: tokens.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.28)'
  },
  rowLabel: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.bold
  },
  rowValue: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  button: { minWidth: 240, marginTop: tokens.space.md }
});
