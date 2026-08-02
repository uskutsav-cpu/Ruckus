import { useState } from 'react';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { StatePanel } from '@/components/ui/state-panel';
import { StatusPill } from '@/components/ui/status-pill';
import {
  competitionMetricLabels,
  competitionMetricRules
} from '@/features/growth/campaign-types';
import {
  useCampusCompetitions,
  useCompetitionStandings
} from '@/features/growth/use-campaigns';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function CompetitionsScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const campusId = profile?.campus_id ?? null;
  const competitions = useCampusCompetitions(campusId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? competitions.data?.[0]?.id ?? null;
  const standings = useCompetitionStandings(activeId);

  if (competitions.isPending) {
    return (
      <AppScreen title="Club competitions">
        <BackButton />
        <ListCardSkeleton />
      </AppScreen>
    );
  }

  if (competitions.isError) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="warning"
          title="Competitions unavailable"
          message="Campus competitions could not be loaded. Try again shortly."
        />
      </AppScreen>
    );
  }

  if ((competitions.data?.length ?? 0) === 0) {
    return (
      <AppScreen title="Club competitions">
        <BackButton />
        <StatePanel
          icon="info"
          title="No competitions running"
          message="Your campus has not started a club competition yet. Check back during welcome week."
        />
      </AppScreen>
    );
  }

  const selected = competitions.data?.find((entry) => entry.id === activeId) ?? null;

  return (
    <AppScreen
      eyebrow="Campus"
      title="Club competitions"
      subtitle="How campus organizations are doing this period."
      scroll
    >
      <BackButton />

      {(competitions.data?.length ?? 0) > 1 ? (
        <View style={styles.pillRow}>
          {competitions.data?.map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`Show ${entry.name}`}
              accessibilityState={{ selected: entry.id === activeId }}
              onPress={() => setSelectedId(entry.id)}
            >
              <StatusPill
                label={entry.name}
                tone={entry.id === activeId ? 'accent' : 'neutral'}
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {selected ? (
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {selected.name}
            </Text>
            <StatusPill
              label={selected.isOpen ? 'Open' : 'Closed'}
              tone={selected.isOpen ? 'success' : 'neutral'}
            />
          </View>
          <Text style={[styles.meta, { color: theme.textSubtle }]}>
            {format(new Date(selected.startsOn), 'MMM d')} –{' '}
            {format(new Date(selected.endsOn), 'MMM d, yyyy')}
          </Text>
          <Text style={[styles.rule, { color: theme.text }]}>
            Scoring: {competitionMetricLabels[selected.metric]}
          </Text>
          <Text style={[styles.meta, { color: theme.textSubtle }]}>
            {competitionMetricRules[selected.metric]}
          </Text>
        </View>
      ) : null}

      {standings.isPending ? <ListCardSkeleton /> : null}
      {standings.isError ? (
        <ErrorState
          icon="warning"
          title="Standings unavailable"
          message="The standings for this competition could not be loaded."
        />
      ) : null}

      {standings.data && standings.data.standings.length === 0 ? (
        <StatePanel
          icon="info"
          title="No scores yet"
          message="No organization has scored in this competition window yet."
        />
      ) : null}

      {standings.data && standings.data.standings.length > 0 ? (
        <View style={styles.section} accessibilityRole="list">
          {standings.data.standings.map((entry) => (
            <View
              key={entry.organizationId}
              accessibilityRole="text"
              accessibilityLabel={`Rank ${entry.rank}, ${entry.organizationName}, ${entry.score} points`}
              style={[styles.standingRow, { backgroundColor: theme.surfaceMuted }]}
            >
              <Text style={[styles.rank, { color: theme.textSubtle }]}>
                #{entry.rank}
              </Text>
              <Text style={[styles.orgName, { color: theme.text }]} numberOfLines={2}>
                {entry.organizationName}
              </Text>
              <Text style={[styles.score, { color: theme.text }]}>
                {entry.score.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <InlineNotice
        tone="info"
        icon="safety"
        message="Competitions rank organizations, never individual students. Ties share a rank."
      />

      <Text style={[styles.footnote, { color: theme.textSubtle }]}>
        Only verified activity counts. Referrals score once the referred student completes
        a real check-in, so bulk signups cannot move a club up the board.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginTop: tokens.space.md
  },
  section: { gap: tokens.space.sm, marginTop: tokens.space.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.sm
  },
  meta: { fontSize: 12, lineHeight: 18 },
  rule: { fontSize: 14, fontWeight: '600' },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  rank: { fontSize: 13, fontWeight: '700', minWidth: 32 },
  orgName: { flex: 1, fontSize: 14, fontWeight: '600' },
  score: { fontSize: 16, fontWeight: '700' },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: tokens.space.lg }
});
