import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { formatDistanceToNowStrict } from 'date-fns';
import { router } from 'expo-router';
import { Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import {
  applyReferralCode,
  fetchAccountTools,
  requestDataExport,
  updateProfilePreferences
} from '@/features/profile/account-tools-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function PrivacyAndGrowthScreen() {
  const { isDemo, user } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const tools = useQuery({
    queryKey: ['account-tools', user?.id, isDemo],
    queryFn: () => fetchAccountTools(user!.id, isDemo),
    enabled: Boolean(user)
  });
  const [referralCode, setReferralCode] = useState('');
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string } | null>(
    null
  );
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['account-tools'] });
  };
  const preferences = useMutation({
    mutationFn: (input: Parameters<typeof updateProfilePreferences>[1]) =>
      updateProfilePreferences(user!.id, input, isDemo),
    onSuccess: invalidate
  });
  const exportMutation = useMutation({
    mutationFn: () => requestDataExport(isDemo),
    onSuccess: async () => {
      setNotice({
        tone: 'info',
        text: isDemo
          ? 'Demo export request validated locally.'
          : 'Your export request is queued. This screen will show its current state.'
      });
      await invalidate();
    }
  });
  const referralMutation = useMutation({
    mutationFn: () => applyReferralCode(referralCode, isDemo),
    onSuccess: (status) => {
      setReferralCode('');
      setNotice({
        tone: 'info',
        text: `Referral ${status}. It qualifies only after your first verified event check-in.`
      });
    },
    onError: () =>
      setNotice({
        tone: 'error',
        text: 'That code could not be applied. Self-referrals, duplicates, and cross-campus codes are rejected.'
      })
  });

  if (tools.isLoading) {
    return (
      <AppScreen>
        <BackButton label="Settings" />
        <ListCardSkeleton count={3} />
      </AppScreen>
    );
  }
  if (tools.isError || !tools.data) {
    return (
      <AppScreen>
        <BackButton label="Settings" />
        <ErrorState
          icon="refresh"
          title="Privacy controls unavailable"
          message="Your choices were not changed. Try again."
          actionLabel="Try again"
          onAction={() => void tools.refetch()}
        />
      </AppScreen>
    );
  }

  const data = tools.data;
  const updateBoolean = (
    key:
      | 'leaderboard_visible'
      | 'show_attended_history'
      | 'show_hosted_history'
      | 'reduced_motion',
    value: boolean
  ) => void preferences.mutateAsync({ [key]: value });
  const referralLink = `ruckus://public/referral/${data.referral.code}`;

  return (
    <AppScreen
      eyebrow="Account controls"
      title="Privacy & growth"
      subtitle="Choose what is public, request your data, and understand referral progress."
    >
      <BackButton label="Settings" onPress={() => router.back()} />
      {notice ? <InlineNotice tone={notice.tone} message={notice.text} /> : null}

      <Section title="Privacy choices">
        <Preference
          title="Public leaderboard"
          description="Allow your display name and server-computed XP to appear in campus rankings."
          value={data.preferences.leaderboard_visible}
          onChange={(value) => updateBoolean('leaderboard_visible', value)}
        />
        <Preference
          title="Show attended history"
          description="Off by default. Public pages still never expose attendee lists."
          value={data.preferences.show_attended_history}
          onChange={(value) => updateBoolean('show_attended_history', value)}
        />
        <Preference
          title="Show hosted history"
          description="Show completed public events you hosted on your profile."
          value={data.preferences.show_hosted_history}
          onChange={(value) => updateBoolean('show_hosted_history', value)}
        />
        <Preference
          title="Reduced motion"
          description="Reduce celebratory and swipe animation where supported."
          value={data.preferences.reduced_motion}
          onChange={(value) => updateBoolean('reduced_motion', value)}
        />
      </Section>

      <Section title="Your referral">
        <View style={[styles.codeCard, { backgroundColor: theme.accentMuted }]}>
          <Text style={[styles.code, { color: theme.text }]}>{data.referral.code}</Text>
          <Text style={[styles.codeHelp, { color: theme.textMuted }]}>
            {data.referral.attributed} attributed · {data.referral.qualified} qualified ·{' '}
            {data.referral.rewarded} rewarded
          </Text>
        </View>
        <View style={styles.buttons}>
          <PrimaryButton
            label="Copy code"
            variant="secondary"
            leadingIcon="copy"
            onPress={() => {
              void Clipboard.setStringAsync(data.referral.code);
              setNotice({ tone: 'info', text: 'Referral code copied.' });
            }}
            style={styles.flex}
          />
          <PrimaryButton
            label="Share"
            variant="secondary"
            leadingIcon="share"
            onPress={() =>
              void Share.share({ message: `Join me on Ruckus: ${referralLink}` })
            }
            style={styles.flex}
          />
        </View>
        <InlineNotice message="Referral XP is server-controlled and awarded only after the referred member completes a verified event check-in. Self-referrals and duplicate attribution are rejected." />
        <TextField
          label="Have a referral code?"
          value={referralCode}
          onChangeText={setReferralCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
        />
        <PrimaryButton
          label="Apply code"
          variant="secondary"
          loading={referralMutation.isPending}
          disabled={referralCode.trim().length < 6}
          onPress={() => referralMutation.mutate()}
        />
      </Section>

      <Section title="Download your data">
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Request an export of eligible account, profile, RSVP, organization, and activity
          data. Private data is delivered only through an authenticated, expiring artifact
          workflow.
        </Text>
        {data.exportRequest ? (
          <InlineNotice
            message={`Request ${data.exportRequest.status} · submitted ${formatDistanceToNowStrict(new Date(data.exportRequest.requestedAt), { addSuffix: true })}`}
          />
        ) : null}
        <PrimaryButton
          label={data.exportRequest ? 'Export already requested' : 'Request data export'}
          variant="secondary"
          disabled={Boolean(data.exportRequest)}
          loading={exportMutation.isPending}
          onPress={() => exportMutation.mutate()}
        />
      </Section>
    </AppScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Preference({
  title,
  description,
  value,
  onChange
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.preference, { borderColor: theme.border }]}>
      <View style={styles.flex}>
        <Text style={[styles.preferenceTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.preferenceBody, { color: theme.textMuted }]}>
          {description}
        </Text>
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: tokens.space.xl },
  sectionTitle: {
    marginBottom: tokens.space.md,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold
  },
  preference: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: tokens.space.md
  },
  flex: { flex: 1 },
  preferenceTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  preferenceBody: {
    marginTop: 4,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  codeCard: { borderRadius: tokens.radius.md, padding: tokens.space.lg },
  code: {
    fontSize: tokens.type.title,
    fontWeight: tokens.weight.black,
    letterSpacing: 2
  },
  codeHelp: { marginTop: tokens.space.sm, fontSize: tokens.type.caption },
  buttons: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm },
  body: {
    marginBottom: tokens.space.md,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  }
});
