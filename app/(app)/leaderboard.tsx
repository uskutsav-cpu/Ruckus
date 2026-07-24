import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatePanel } from '@/components/ui/state-panel';
import type { LeaderboardPeriod } from '@/features/profile/profile-types';
import { useLeaderboard } from '@/features/profile/use-profile';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const periods: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' }
];

export default function LeaderboardScreen() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const leaderboard = useLeaderboard(period);

  return (
    <AppScreen
      eyebrow="Campus energy"
      title="Leaderboard"
      subtitle="Rankings reflect verified participation and reliability—not popularity, appearance, or private messages."
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={[styles.back, { backgroundColor: theme.surfaceMuted }]}
      >
        <Text style={[styles.backText, { color: theme.text }]}>← Profile</Text>
      </Pressable>
      <View style={styles.periods}>
        {periods.map((option) => {
          const active = period === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setPeriod(option.value)}
              style={[
                styles.period,
                { backgroundColor: active ? theme.primary : theme.surfaceMuted }
              ]}
            >
              <Text
                style={[styles.periodText, { color: active ? '#FFFFFF' : theme.text }]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {leaderboard.isLoading ? (
        <LoadingScreen label="Calculating campus ranks…" />
      ) : leaderboard.isError ? (
        <StatePanel
          icon="📡"
          title="Ranks unavailable"
          message="Try again in a moment."
          actionLabel="Try again"
          onAction={() => void leaderboard.refetch()}
        />
      ) : (
        <View style={styles.list}>
          {(leaderboard.data ?? []).map((entry) => (
            <View
              key={entry.profileId}
              style={[
                styles.row,
                {
                  backgroundColor: entry.isCurrentUser
                    ? `${theme.primary}18`
                    : theme.surface,
                  borderColor: entry.isCurrentUser ? theme.primary : theme.border
                }
              ]}
            >
              <Text style={[styles.rank, { color: theme.text }]}>
                {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
              </Text>
              <View style={styles.person}>
                <Text style={[styles.name, { color: theme.text }]}>
                  {entry.displayName}
                  {entry.isCurrentUser ? ' · You' : ''}
                </Text>
                <Text style={[styles.caption, { color: theme.textMuted }]}>
                  Verified campus participation
                </Text>
              </View>
              <Text style={[styles.xp, { color: theme.primary }]}>{entry.xp} XP</Text>
            </View>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  back: {
    minHeight: tokens.touchTarget,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    marginBottom: tokens.space.md
  },
  backText: { fontSize: 13, fontWeight: '800' },
  periods: { flexDirection: 'row', gap: 6, marginBottom: tokens.space.lg },
  period: {
    minHeight: tokens.touchTarget,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 5
  },
  periodText: { fontSize: 11, fontWeight: '900', textAlign: 'center' },
  list: { gap: tokens.space.sm },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md
  },
  rank: { width: 42, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  person: { flex: 1 },
  name: { fontSize: 15, fontWeight: '900' },
  caption: { marginTop: 3, fontSize: 10, fontWeight: '700' },
  xp: { fontSize: 15, fontWeight: '900' }
});
