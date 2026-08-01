import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type {
  LeaderboardEntry,
  LeaderboardPeriod
} from '@/features/profile/profile-types';
import { useLeaderboard } from '@/features/profile/use-profile';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const periods = [
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'all', label: 'All time' }
] as const satisfies readonly {
  value: LeaderboardPeriod;
  label: string;
}[];

export default function LeaderboardScreen() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const leaderboard = useLeaderboard(period);
  const currentUser = leaderboard.data?.find((entry) => entry.isCurrentUser);

  return (
    <AppScreen
      eyebrow="Optional"
      title="Leaderboard"
      subtitle="XP from verified activity participation."
    >
      <BackButton label="Your profile" onPress={() => router.back()} />
      <SegmentedControl
        accessibilityLabel="Leaderboard period"
        value={period}
        options={periods}
        onChange={setPeriod}
      />

      {currentUser ? (
        <View
          style={[
            styles.yourRank,
            { backgroundColor: theme.surfaceMuted, borderColor: theme.border }
          ]}
        >
          <View>
            <Text style={[styles.yourRankLabel, { color: theme.textMuted }]}>
              Your position
            </Text>
            <Text style={[styles.yourRankValue, { color: theme.text }]}>
              #{currentUser.rank}
            </Text>
          </View>
          <View style={styles.yourXp}>
            <Text style={[styles.yourXpValue, { color: theme.text }]}>
              {currentUser.xp}
            </Text>
            <Text style={[styles.yourXpLabel, { color: theme.textMuted }]}>
              XP this period
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Participation this period
        </Text>
      </View>

      {leaderboard.isLoading ? (
        <ListCardSkeleton count={5} />
      ) : leaderboard.isError ? (
        <ErrorState
          icon="↻"
          title="Ranks are unavailable"
          message="Your XP is safe. Reconnect and try this period again."
          actionLabel="Try again"
          onAction={() => void leaderboard.refetch()}
        />
      ) : leaderboard.data?.length ? (
        <View
          accessibilityRole="list"
          accessibilityLabel={`${period} leaderboard`}
          style={[
            styles.list,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
          ]}
        >
          {leaderboard.data.map((entry, index) => (
            <LeaderboardRow
              key={entry.profileId}
              entry={entry}
              showDivider={index < (leaderboard.data?.length ?? 0) - 1}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="#"
          title="No XP in this period"
          message="Rankings appear after verified activity participation."
        />
      )}

      <Text style={[styles.note, { color: theme.textMuted }]}>
        Rank movement is not shown because the backend does not provide historical
        position data.
      </Text>
    </AppScreen>
  );
}

function LeaderboardRow({
  entry,
  showDivider
}: {
  entry: LeaderboardEntry;
  showDivider: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Rank ${entry.rank}, ${entry.displayName}, ${entry.xp} XP${entry.isCurrentUser ? ', you' : ''}`}
      style={[
        styles.row,
        showDivider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border
        },
        entry.isCurrentUser && { backgroundColor: theme.accentMuted }
      ]}
    >
      <View style={[styles.rank, { backgroundColor: theme.surfaceMuted }]}>
        <Text style={[styles.rankText, { color: theme.text }]}>{entry.rank}</Text>
      </View>
      <View style={[styles.avatar, { backgroundColor: theme.surfaceMuted }]}>
        <Text style={[styles.avatarText, { color: theme.text }]}>
          {entry.displayName.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.person}>
        <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
          {entry.displayName}
          {entry.isCurrentUser ? ' · You' : ''}
        </Text>
        <Text style={[styles.caption, { color: theme.textMuted }]}>
          Verified participation
        </Text>
      </View>
      <Text style={[styles.xp, { color: theme.accent }]}>{entry.xp} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  yourRank: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    marginTop: tokens.space.md
  },
  yourRankLabel: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.bold
  },
  yourRankValue: {
    marginTop: tokens.space.xs,
    fontSize: 36,
    fontWeight: tokens.weight.bold,
    letterSpacing: -1
  },
  yourXp: { alignItems: 'flex-end' },
  yourXpValue: {
    fontSize: 28,
    fontWeight: tokens.weight.bold
  },
  yourXpLabel: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.bold
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space.xl,
    marginBottom: tokens.space.md
  },
  sectionTitle: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  list: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: tokens.radius.md
  },
  row: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space.md
  },
  rank: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  rankText: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
    marginLeft: tokens.space.sm
  },
  avatarText: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  person: { flex: 1, marginLeft: tokens.space.md },
  name: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  caption: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.medium
  },
  xp: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  note: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.micro,
    lineHeight: 16,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  }
});
