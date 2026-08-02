import { useState } from 'react';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { ambassadorTierLabels } from '@/features/growth/ambassador-types';
import {
  useAmbassadorDashboard,
  useApplyForAmbassadorProgram,
  useSemesterLeaderboard
} from '@/features/growth/use-ambassador';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const minimumMotivation = 40;

export default function AmbassadorScreen() {
  const { theme } = useTheme();
  const dashboard = useAmbassadorDashboard();
  const leaderboard = useSemesterLeaderboard();
  const apply = useApplyForAmbassadorProgram();
  const [motivation, setMotivation] = useState('');

  if (dashboard.isPending) {
    return (
      <AppScreen title="Ambassadors">
        <BackButton />
        <ListCardSkeleton />
      </AppScreen>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="warning"
          title="Ambassador programme unavailable"
          message="We could not load the ambassador programme. Try again shortly."
        />
      </AppScreen>
    );
  }

  const semester = leaderboard.data?.semester ?? null;
  const viewer = leaderboard.data?.viewer ?? null;

  if (!dashboard.data.isAmbassador) {
    const remaining = Math.max(minimumMotivation - motivation.trim().length, 0);
    return (
      <AppScreen
        eyebrow="Growth"
        title="Become a campus ambassador"
        subtitle="Ambassadors help new students find events. Applications are reviewed by your campus team."
        scroll
      >
        <BackButton />
        <TextField
          label="Why do you want to be an ambassador?"
          value={motivation}
          onChangeText={setMotivation}
          multiline
          maxLength={2000}
          help={
            remaining > 0
              ? `${remaining} more characters needed.`
              : 'Ready to submit for campus review.'
          }
          placeholder="I run the outdoors club and want to help more first-year students find events on campus."
        />
        <PrimaryButton
          label="Submit application"
          disabled={remaining > 0 || apply.isPending}
          loading={apply.isPending}
          accessibilityHint="Sends your application to your campus administration team for review."
          onPress={() =>
            apply.mutate(motivation.trim(), {
              onSuccess: () => {
                setMotivation('');
                Alert.alert(
                  'Application submitted',
                  'Your campus team will review your application.'
                );
              },
              onError: () =>
                Alert.alert(
                  'Application failed',
                  'You may already have an application under review.'
                )
            })
          }
        />
        <InlineNotice
          tone="info"
          icon="safety"
          message="Being an ambassador does not give you moderation or administration access."
        />
        {semester && viewer ? (
          <Text style={[styles.footnote, { color: theme.textSubtle }]}>
            {semester.name}: you are ranked #{viewer.rank} with {viewer.xpTotal} XP.
          </Text>
        ) : null}
      </AppScreen>
    );
  }

  const { status, tier, counts, nextTier, referralCode, activatedAt, privacy } =
    dashboard.data;

  return (
    <AppScreen
      eyebrow="Growth"
      title="Ambassador dashboard"
      subtitle="Your referral impact this semester."
      scroll
    >
      <BackButton />

      <View style={styles.pillRow}>
        <StatusPill
          label={ambassadorTierLabels[tier]}
          tone={status === 'active' ? 'success' : 'neutral'}
        />
        <StatusPill label={status} tone={status === 'active' ? 'accent' : 'warning'} />
      </View>

      <Text style={[styles.meta, { color: theme.textSubtle }]}>
        Active since {format(new Date(activatedAt), 'MMMM d, yyyy')}
      </Text>

      {referralCode ? (
        <View style={[styles.codeCard, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.codeLabel, { color: theme.textSubtle }]}>
            Your ambassador code
          </Text>
          <Text
            accessibilityLabel={`Your ambassador code is ${referralCode.split('').join(' ')}`}
            style={[styles.code, { color: theme.text }]}
          >
            {referralCode}
          </Text>
          <PrimaryButton
            label="Copy code"
            variant="secondary"
            leadingIcon="copy"
            onPress={() => {
              void Clipboard.setStringAsync(referralCode);
              Alert.alert('Copied', 'Your ambassador code is on the clipboard.');
            }}
          />
        </View>
      ) : (
        <InlineNotice
          tone="info"
          message="Your ambassador code is inactive. Contact your campus team if this is unexpected."
        />
      )}

      <View style={styles.tileRow}>
        <View style={[styles.tile, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.tileValue, { color: theme.text }]}>
            {counts.qualified.toLocaleString()}
          </Text>
          <Text style={[styles.tileLabel, { color: theme.textSubtle }]}>
            Qualified referrals
          </Text>
        </View>
        <View style={[styles.tile, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.tileValue, { color: theme.text }]}>
            {counts.attributed.toLocaleString()}
          </Text>
          <Text style={[styles.tileLabel, { color: theme.textSubtle }]}>Signed up</Text>
        </View>
      </View>

      <Text style={[styles.meta, { color: theme.textSubtle }]}>
        A referral qualifies only after the student verifies a real event check-in.
      </Text>

      {nextTier ? (
        <InlineNotice
          tone="info"
          icon="star"
          message={
            nextTier.qualifiedNeeded > 0
              ? `${nextTier.qualifiedNeeded} more qualified referrals to reach ${ambassadorTierLabels[nextTier.tier]}.`
              : `You have met the requirement for ${ambassadorTierLabels[nextTier.tier]}.`
          }
        />
      ) : null}

      {semester ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {semester.name} standings
          </Text>
          {viewer ? (
            <Text style={[styles.meta, { color: theme.textSubtle }]}>
              You are ranked #{viewer.rank} with {viewer.xpTotal} XP.
            </Text>
          ) : null}
          {leaderboard.data?.entries.map((entry) => (
            <View key={entry.profileId} style={styles.rowBetween}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>
                #{entry.rank} {entry.displayName ?? 'Ruckus member'}
              </Text>
              <Text style={[styles.rowValue, { color: theme.textSubtle }]}>
                {entry.xpTotal.toLocaleString()} XP
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[styles.footnote, { color: theme.textSubtle }]}>{privacy}</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.md },
  meta: { fontSize: 13, lineHeight: 19, marginTop: tokens.space.sm },
  codeCard: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.sm,
    marginTop: tokens.space.md
  },
  codeLabel: { fontSize: 12 },
  code: { fontSize: 26, fontWeight: '700', letterSpacing: 2 },
  tileRow: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.md },
  tile: { flex: 1, borderRadius: tokens.radius.md, padding: tokens.space.md, gap: 2 },
  tileValue: { fontSize: 24, fontWeight: '700' },
  tileLabel: { fontSize: 12 },
  section: { gap: tokens.space.sm, marginTop: tokens.space.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: tokens.space.sm
  },
  rowLabel: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  rowValue: { fontSize: 13 },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: tokens.space.lg }
});
