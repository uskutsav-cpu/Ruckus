import { router } from 'expo-router';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatePanel } from '@/components/ui/state-panel';
import { usePendingMatches } from '@/features/groups/use-groups';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function PendingMatchesScreen() {
  const { theme } = useTheme();
  const pending = usePendingMatches();

  if (pending.isLoading) return <LoadingScreen label="Checking waitlists…" />;

  return (
    <AppScreen
      eyebrow="Matching"
      title="Pending matches"
      subtitle="You’re interested, but a compatible crew hasn’t reached the campus group threshold yet."
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/groups')}
        style={[styles.back, { backgroundColor: theme.surfaceMuted }]}
      >
        <Text style={[styles.backText, { color: theme.text }]}>← Your groups</Text>
      </Pressable>

      {pending.isError ? (
        <StatePanel
          icon="📡"
          title="Waitlists are unavailable"
          message="Your existing interest is recorded. Pull this screen up again in a moment."
          actionLabel="Try again"
          onAction={() => void pending.refetch()}
        />
      ) : pending.data?.length ? (
        <View style={styles.list}>
          {pending.data.map((entry) => (
            <View
              key={entry.id}
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border }
              ]}
            >
              <View style={styles.icon}>
                <Text style={styles.iconText}>⏳</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.title, { color: theme.text }]}>{entry.title}</Text>
                <Text style={[styles.time, { color: theme.textMuted }]}>
                  {format(new Date(entry.startsAt), 'EEE, MMM d · h:mm a')}
                </Text>
                <Text style={[styles.joined, { color: theme.primary }]}>
                  Joined {formatDistanceToNowStrict(new Date(entry.joinedAt))} ago
                </Text>
              </View>
            </View>
          ))}
          <Text style={[styles.note, { color: theme.textMuted }]}>
            You’ll get a push notification if a group forms. Exact meeting spots are never
            shown on a public waitlist.
          </Text>
        </View>
      ) : (
        <StatePanel
          icon="✨"
          title="Nothing pending"
          message="All caught up. Browse the deck to find another activity."
          actionLabel="Open the deck"
          onAction={() => router.replace('/deck')}
        />
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
    marginBottom: tokens.space.lg
  },
  backText: { fontSize: 14, fontWeight: '800' },
  list: { gap: tokens.space.md },
  card: {
    flexDirection: 'row',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#FEF3C7'
  },
  iconText: { fontSize: 24 },
  cardBody: { flex: 1 },
  title: { fontSize: 19, fontWeight: '900' },
  time: { marginTop: 5, fontSize: 14, fontWeight: '700' },
  joined: { marginTop: tokens.space.sm, fontSize: 12, fontWeight: '900' },
  note: { marginTop: tokens.space.sm, fontSize: 13, lineHeight: 19 }
});
