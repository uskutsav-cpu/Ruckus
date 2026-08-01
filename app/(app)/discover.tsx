import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EventCard } from '@/features/events/event-card';
import { eventErrorMessage } from '@/features/events/event-service';
import type { EventFilters } from '@/features/events/event-types';
import {
  useEventDecision,
  useEventFeed,
  useJoinEvent
} from '@/features/events/use-events';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const categories = [
  'All',
  'Outdoor',
  'Games',
  'Music',
  'Food',
  'Arts',
  'Fitness'
] as const;

function CategoryChip({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <SecondaryButton
      label={label}
      accessibilityLabel={`Filter by ${label}`}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.accentMuted, borderColor: theme.primary }
          : undefined
      ]}
    />
  );
}

export default function DiscoverScreen() {
  const { theme } = useTheme();
  const network = useNetInfo();
  const [mode, setMode] = useState<'deck' | 'list'>('deck');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('All');
  const filters = useMemo<EventFilters>(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(category !== 'All' ? { category } : {})
    }),
    [category, search]
  );
  const feed = useEventFeed(filters);
  const events = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const current = events[0];
  const join = useJoinEvent(current?.id ?? '');
  const decision = useEventDecision();
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const openEvent = (eventId: string) =>
    router.push({ pathname: '/event/[id]', params: { id: eventId } });

  const joinCurrent = () => {
    if (!current) return;
    setResultMessage(null);
    join.mutate(undefined, {
      onSuccess: (result) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setResultMessage(
          result.status === 'confirmed'
            ? "You're in — event chat is now open."
            : result.status === 'waitlisted'
              ? `You're on the waitlist${result.waitlistPosition ? ` at #${result.waitlistPosition}` : ''}.`
              : result.status === 'pending'
                ? 'Request sent — the host will review it.'
                : 'This event is already in your schedule.'
        );
      }
    });
  };

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Your campus, happening now"
        title="Discover"
        subtitle="Real events from campus organizers. Counts and availability come from the event itself."
      />

      {network.isConnected === false ? (
        <InlineNotice
          tone="offline"
          icon="↯"
          message="Offline — showing cached events. Joining waits for a connection."
        />
      ) : null}

      <View
        style={[
          styles.search,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
        ]}
      >
        <AppIcon name="discover" color={theme.textMuted} size={20} />
        <TextInput
          accessibilityLabel="Search events and organizers"
          placeholder="Search events or organizers"
          placeholderTextColor={theme.textSubtle}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityLabel="Event category filters"
      >
        {categories.map((item) => (
          <CategoryChip
            key={item}
            label={item}
            selected={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </ScrollView>

      <SegmentedControl
        accessibilityLabel="Discovery view"
        value={mode}
        options={[
          { value: 'deck', label: 'For you' },
          { value: 'list', label: 'List' }
        ]}
        onChange={setMode}
      />

      <View style={styles.results}>
        {feed.isLoading ? (
          <>
            <ListCardSkeleton />
            <ListCardSkeleton />
          </>
        ) : feed.isError ? (
          <ErrorState
            icon="↻"
            title="Events are unavailable"
            message="Your RSVPs are unchanged. Check your connection and try again."
            actionLabel="Try again"
            onAction={() => void feed.refetch()}
          />
        ) : events.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No events match"
            message="Clear a filter or check back when organizers publish something new."
            actionLabel="Clear filters"
            onAction={() => {
              setSearch('');
              setCategory('All');
            }}
          />
        ) : mode === 'deck' && current ? (
          <View style={styles.deck}>
            <EventCard event={current} onPress={() => openEvent(current.id)} />
            <View style={styles.actionRow}>
              <SecondaryButton
                label="Pass"
                leadingIcon="close"
                disabled={decision.isPending}
                onPress={() =>
                  decision.mutate({ eventId: current.id, decision: 'passed' })
                }
                style={styles.action}
              />
              <SecondaryButton
                label="Save"
                leadingIcon="bookmark"
                disabled={decision.isPending}
                onPress={() =>
                  decision.mutate({ eventId: current.id, decision: 'saved' })
                }
                style={styles.action}
              />
              <PrimaryButton
                label={current.availability === 'waitlist' ? 'Waitlist' : 'Join'}
                leadingIcon="check"
                loading={join.isPending}
                disabled={
                  network.isConnected === false || current.availability === 'full'
                }
                onPress={joinCurrent}
                style={styles.joinAction}
              />
            </View>
            {resultMessage ? (
              <InlineNotice tone="success" icon="✓" message={resultMessage} />
            ) : null}
            {join.isError ? (
              <InlineNotice
                tone="error"
                icon="!"
                message={eventErrorMessage(join.error)}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => openEvent(event.id)}
              />
            ))}
            {feed.hasNextPage ? (
              <SecondaryButton
                label="Load more"
                loading={feed.isFetchingNextPage}
                onPress={() => void feed.fetchNextPage()}
              />
            ) : null}
          </View>
        )}
      </View>

      <View style={[styles.crews, { borderColor: theme.border }]}>
        <View style={styles.crewsCopy}>
          <Text style={[styles.crewsTitle, { color: theme.text }]}>Ruckus Crews</Text>
          <Text style={[styles.crewsText, { color: theme.textMuted }]}>
            Prefer a small matched group? The original activity deck is still here.
          </Text>
        </View>
        <SecondaryButton label="Open crews" onPress={() => router.push('/deck')} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: tokens.layout.actionHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.md,
    marginBottom: tokens.space.sm
  },
  searchInput: {
    flex: 1,
    minHeight: tokens.layout.actionHeight,
    fontSize: tokens.type.body
  },
  chips: { gap: tokens.space.sm, paddingVertical: tokens.space.sm },
  chip: { minHeight: 40, minWidth: 70 },
  results: { marginTop: tokens.space.md },
  deck: { gap: tokens.space.md },
  list: { gap: tokens.space.md },
  actionRow: { flexDirection: 'row', gap: tokens.space.sm },
  action: { flex: 0.8 },
  joinAction: { flex: 1.2 },
  crews: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: tokens.space.xl,
    paddingTop: tokens.space.lg,
    gap: tokens.space.md
  },
  crewsCopy: { gap: tokens.space.xs },
  crewsTitle: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  crewsText: { fontSize: tokens.type.caption, lineHeight: tokens.lineHeight.caption }
});
