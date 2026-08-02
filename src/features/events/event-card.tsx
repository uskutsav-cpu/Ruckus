import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { CapacityMeter } from '@/components/ui/capacity-meter';
import { StatusPill } from '@/components/ui/status-pill';
import type { EventDetail, EventSummary } from '@/features/events/event-types';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type EventCardProps = {
  event: EventSummary | EventDetail;
  onPress: () => void;
  relationship?: string;
};

const gradients: Record<string, readonly [string, string]> = {
  Outdoor: ['#1B6F5B', '#6BAF73'],
  Games: ['#51388B', '#8F6ACC'],
  Music: ['#9B3C64', '#D07077'],
  Food: ['#A25B23', '#D9A342'],
  Arts: ['#276C83', '#68A5B4'],
  Fitness: ['#3E6940', '#87A94F']
};

export function EventCard({ event, onPress, relationship }: EventCardProps) {
  const { theme } = useTheme();
  const gradient = gradients[event.category] ?? [tokens.color.violetDeep, theme.primary];
  const recommendationReason =
    'recommendationReasons' in event ? event.recommendationReasons[0] : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${format(new Date(event.startsAt), "EEEE, MMMM d 'at' p")}, ${event.venueName}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        tokens.shadow.card,
        { transform: [{ scale: pressed ? 0.992 : 1 }] }
      ]}
    >
      <LinearGradient colors={gradient} style={styles.cover}>
        <View style={styles.coverTop}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
          {relationship ? <StatusPill label={relationship} tone="neutral" /> : null}
        </View>
        <View>
          <Text style={styles.date}>
            {format(new Date(event.startsAt), 'EEE · MMM d · p')}
          </Text>
          <Text style={styles.title}>{event.title}</Text>
        </View>
      </LinearGradient>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <AppIcon name="location" size={17} color={theme.textMuted} />
          <Text numberOfLines={1} style={[styles.meta, { color: theme.textMuted }]}>
            {event.venueName}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <AppIcon name="organization" size={17} color={theme.textMuted} />
          <Text numberOfLines={1} style={[styles.meta, { color: theme.textMuted }]}>
            {event.organizationName ?? 'Independent campus host'}
          </Text>
          {event.organizationVerified ? (
            <AppIcon name="check" size={15} color={theme.success} />
          ) : null}
        </View>
        {recommendationReason ? (
          <View style={[styles.reason, { backgroundColor: theme.accentMuted }]}>
            <AppIcon name="discover" size={15} color={theme.accent} />
            <Text numberOfLines={1} style={[styles.reasonText, { color: theme.text }]}>
              {recommendationReason}
            </Text>
          </View>
        ) : null}
        <CapacityMeter
          confirmed={event.confirmedCount}
          capacity={event.capacity}
          waitlistEnabled={event.waitlistEnabled}
          compact
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg
  },
  cover: {
    minHeight: 178,
    justifyContent: 'space-between',
    padding: tokens.space.md
  },
  coverTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.space.sm
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(12,14,13,0.56)'
  },
  categoryText: { color: '#FFFFFF', fontSize: tokens.type.micro, fontWeight: '700' },
  date: {
    color: '#FFFFFF',
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.bold,
    marginBottom: tokens.space.xs
  },
  title: {
    color: '#FFFFFF',
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.heavy,
    letterSpacing: -0.7
  },
  body: { padding: tokens.space.md, gap: tokens.space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  meta: {
    flexShrink: 1,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: tokens.space.xs,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 6
  },
  reasonText: {
    maxWidth: 250,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  }
});
