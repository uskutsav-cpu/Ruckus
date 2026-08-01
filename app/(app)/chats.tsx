import { formatDistanceToNowStrict } from 'date-fns';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useEventChats } from '@/features/events/use-events';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function ChatsScreen() {
  const { theme } = useTheme();
  const chats = useEventChats();
  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Private event channels"
        title="Chats"
        subtitle="Only confirmed attendees and authorized hosts can enter an event chat."
      />
      {chats.isLoading ? (
        <>
          <ListCardSkeleton />
          <ListCardSkeleton />
        </>
      ) : chats.isError ? (
        <ErrorState
          icon="↻"
          title="Chats are unavailable"
          message="Try again when your connection recovers."
          actionLabel="Try again"
          onAction={() => void chats.refetch()}
        />
      ) : !chats.data?.length ? (
        <EmptyState
          icon="chat"
          title="No event chats yet"
          message="A chat opens after your RSVP is confirmed. Pending and waitlisted users cannot enter."
          actionLabel="Find an event"
          onAction={() => router.replace('/discover')}
        />
      ) : (
        <View style={styles.list}>
          {chats.data.map(({ event, relationship }) => (
            <Pressable
              key={event.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${event.title} chat`}
              onPress={() =>
                router.push({ pathname: '/event/[id]/chat', params: { id: event.id } })
              }
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                  opacity: pressed ? 0.72 : 1
                }
              ]}
            >
              <View style={[styles.icon, { backgroundColor: theme.accentMuted }]}>
                <AppIcon name="chat" color={theme.primary} size={22} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: theme.text }]}>{event.title}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {relationship === 'hosting' ? 'Host channel' : 'Confirmed attendee'} ·
                  starts{' '}
                  {formatDistanceToNowStrict(new Date(event.startsAt), {
                    addSuffix: true
                  })}
                </Text>
              </View>
              <AppIcon name="forward" color={theme.textSubtle} size={18} />
            </Pressable>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space.sm },
  row: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  copy: { flex: 1, gap: tokens.space.xs },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  meta: { fontSize: tokens.type.caption, lineHeight: tokens.lineHeight.caption }
});
