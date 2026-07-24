import { router } from 'expo-router';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { usePendingMatches } from '@/features/groups/use-groups';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function PendingMatchesScreen() {
  const { theme } = useTheme();
  const network = useNetInfo();
  const pending = usePendingMatches();

  return (
    <AppScreen
      eyebrow="Waitlists"
      title="You’re in the mix."
      subtitle="These picks are waiting for enough compatible students to form a safe public meetup."
    >
      <BackButton label="Your crews" onPress={() => router.replace('/groups')} />

      {network.isConnected === false ? (
        <InlineNotice
          icon="↯"
          tone="offline"
          message="Offline — showing the most recently saved waitlist state."
        />
      ) : null}

      {pending.isLoading ? (
        <ListCardSkeleton count={2} />
      ) : pending.isError ? (
        <ErrorState
          icon="↻"
          title="Waitlists took a timeout"
          message="Your existing picks are still recorded. Reconnect and try again."
          actionLabel="Try again"
          onAction={() => void pending.refetch()}
        />
      ) : pending.data?.length ? (
        <>
          <View style={styles.list}>
            {pending.data.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border
                  },
                  tokens.shadow.floating
                ]}
              >
                <Image
                  accessibilityLabel={`${entry.title} activity`}
                  contentFit="cover"
                  source={entry.imageSource}
                  style={styles.image}
                />
                <View style={styles.cardBody}>
                  <StatusPill label="WAITING FOR A CREW" tone="warning" />
                  <Text
                    numberOfLines={2}
                    style={[styles.cardTitle, { color: theme.text }]}
                  >
                    {entry.title}
                  </Text>
                  <View style={styles.metadataRow}>
                    <Text style={[styles.metadataIcon, { color: theme.accent }]}>◷</Text>
                    <Text style={[styles.metadata, { color: theme.textMuted }]}>
                      {format(new Date(entry.startsAt), 'EEE, MMM d · h:mm a')}
                    </Text>
                  </View>
                  <Text style={[styles.joined, { color: theme.text }]}>
                    Joined{' '}
                    {formatDistanceToNowStrict(new Date(entry.joinedAt), {
                      addSuffix: true
                    })}
                  </Text>
                  <Text style={[styles.honest, { color: theme.textMuted }]}>
                    Exact waitlist counts aren’t available yet.
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.policy,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.border }
            ]}
          >
            <Text style={[styles.policyTitle, { color: theme.text }]}>
              What happens next
            </Text>
            <Text style={[styles.policyBody, { color: theme.textMuted }]}>
              We’ll notify you if a crew forms. Waitlist picks cannot be cancelled from
              this screen; if a group unlocks, the lobby shows the existing leave policy
              before you decide.
            </Text>
          </View>
          <SecondaryButton
            label="Browse more activities"
            leadingIcon="↗"
            onPress={() => router.replace('/deck')}
            style={styles.browse}
          />
        </>
      ) : (
        <EmptyState
          icon="✓"
          title="Nothing pending"
          message="You’re caught up. Swipe into another plan when you’re ready."
          actionLabel="Open the deck"
          onAction={() => router.replace('/deck')}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space.md },
  card: {
    minHeight: 164,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: tokens.radius.lg
  },
  image: { width: 118, minHeight: 164, backgroundColor: tokens.color.inkSoft },
  cardBody: { flex: 1, padding: tokens.space.md },
  cardTitle: {
    marginTop: tokens.space.sm,
    fontSize: 20,
    lineHeight: 23,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.45
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.space.sm
  },
  metadataIcon: {
    marginRight: 6,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black
  },
  metadata: {
    flex: 1,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.heavy
  },
  joined: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black
  },
  honest: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.medium
  },
  policy: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.lg
  },
  policyTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  policyBody: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  browse: { marginTop: tokens.space.md }
});
