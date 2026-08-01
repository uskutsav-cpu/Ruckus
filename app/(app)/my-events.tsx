import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EventCard } from '@/features/events/event-card';
import type { MyEvent } from '@/features/events/event-types';
import { useMyEvents } from '@/features/events/use-events';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const sections = [
  { key: 'confirmed', title: 'Confirmed', subtitle: 'You have a spot.' },
  { key: 'pending', title: 'Pending approval', subtitle: 'Waiting for the host.' },
  {
    key: 'waitlisted',
    title: 'Waitlisted',
    subtitle: 'You’ll be promoted automatically.'
  },
  { key: 'hosting', title: 'Hosting', subtitle: 'Events you help run.' },
  { key: 'past', title: 'Past', subtitle: 'Completed event history.' }
] as const;

function relationshipSection(item: MyEvent): (typeof sections)[number]['key'] {
  if (new Date(item.event.endsAt).getTime() < Date.now()) return 'past';
  if (item.relationship === 'cancelled' || item.relationship === 'rejected')
    return 'past';
  return item.relationship;
}

export default function MyEventsScreen() {
  const { theme } = useTheme();
  const events = useMyEvents();
  if (events.isLoading) {
    return (
      <AppScreen>
        <ScreenHeader
          title="My Events"
          subtitle="Your plans, requests, and host tools."
        />
        <ListCardSkeleton />
        <ListCardSkeleton />
      </AppScreen>
    );
  }
  if (events.isError) {
    return (
      <AppScreen>
        <ErrorState
          icon="↻"
          title="Your events are unavailable"
          message="No RSVP changed. Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void events.refetch()}
        />
      </AppScreen>
    );
  }
  const items = events.data ?? [];
  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Plans and hosting"
        title="My Events"
        subtitle="Open an event to share it, cancel, check in, or enter chat."
      />
      {items.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Nothing scheduled yet"
          message="Join an event from Discover and it will appear here with its real RSVP status."
          actionLabel="Discover events"
          onAction={() => router.replace('/discover')}
        />
      ) : (
        <View style={styles.sections}>
          {sections.map((section) => {
            const sectionItems = items.filter(
              (item) => relationshipSection(item) === section.key
            );
            if (!sectionItems.length) return null;
            return (
              <View key={section.key} style={styles.section}>
                <View style={styles.headingRow}>
                  <View style={styles.headingCopy}>
                    <Text style={[styles.heading, { color: theme.text }]}>
                      {section.title}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                      {section.subtitle}
                    </Text>
                  </View>
                  <Text style={[styles.count, { color: theme.textMuted }]}>
                    {sectionItems.length}
                  </Text>
                </View>
                <View style={styles.cards}>
                  {sectionItems.map((item) => (
                    <EventCard
                      key={`${section.key}-${item.event.id}`}
                      event={item.event}
                      relationship={section.title}
                      onPress={() =>
                        router.push({
                          pathname: '/event/[id]',
                          params: { id: item.event.id }
                        })
                      }
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: tokens.space.xl },
  section: { gap: tokens.space.md },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start' },
  headingCopy: { flex: 1 },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  subtitle: { marginTop: 2, fontSize: tokens.type.caption },
  count: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  cards: { gap: tokens.space.md }
});
