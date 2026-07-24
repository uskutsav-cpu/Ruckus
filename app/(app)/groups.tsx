import { router } from 'expo-router';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppScreen } from '@/components/ui/app-screen';
import { AvatarStack } from '@/components/ui/avatar-stack';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { StatusPill } from '@/components/ui/status-pill';
import type { GroupLobby } from '@/features/groups/group-types';
import { useGroups } from '@/features/groups/use-groups';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

function groupStatus(group: GroupLobby, currentUserId?: string) {
  const currentMember = group.members.find((member) => member.id === currentUserId);
  if (
    group.status === 'pending_confirmation' &&
    currentMember?.confirmation !== 'confirmed'
  ) {
    return { label: 'CONFIRM NOW', tone: 'warning' as const };
  }
  if (group.status === 'confirmed') {
    return { label: 'CREW CONFIRMED', tone: 'success' as const };
  }
  if (group.status === 'completed') {
    return { label: 'COMPLETED', tone: 'neutral' as const };
  }
  if (group.status === 'cancelled') {
    return { label: 'CANCELLED', tone: 'warning' as const };
  }
  return { label: 'FORMING', tone: 'accent' as const };
}

export default function GroupsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const network = useNetInfo();
  const groups = useGroups();

  return (
    <AppScreen
      eyebrow="Your plans"
      title="Your crews."
      subtitle="Confirm attendance, coordinate privately, and meet at approved public venues."
    >
      <View style={styles.navigation}>
        <SecondaryButton
          label="Discover"
          leadingIcon="←"
          onPress={() => router.replace('/deck')}
          style={styles.navButton}
        />
        <SecondaryButton
          label="Waitlists"
          leadingIcon="◷"
          onPress={() => router.push('/pending')}
          style={styles.navButton}
        />
      </View>

      {network.isConnected === false ? (
        <InlineNotice
          icon="↯"
          tone="offline"
          message="Offline — crew changes and new messages may be delayed."
        />
      ) : null}

      {groups.isLoading ? (
        <ListCardSkeleton />
      ) : groups.isError ? (
        <ErrorState
          icon="↻"
          title="Your crews didn’t load"
          message="Membership and confirmations remain protected. Reconnect and try again."
          actionLabel="Try again"
          onAction={() => void groups.refetch()}
        />
      ) : groups.data?.length ? (
        <View accessibilityRole="list" style={styles.list}>
          {groups.data.map((group) => {
            const status = groupStatus(group, user?.id);
            const confirmedCount = group.members.filter(
              (member) => member.confirmation === 'confirmed'
            ).length;
            const currentMember = group.members.find((member) => member.id === user?.id);
            const needsResponse =
              group.status === 'pending_confirmation' &&
              currentMember?.confirmation !== 'confirmed';

            return (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${group.title} crew. ${status.label}`}
                onPress={() =>
                  router.push({ pathname: '/group/[id]', params: { id: group.id } })
                }
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: needsResponse ? tokens.color.coral : theme.border,
                    opacity: pressed ? 0.76 : 1
                  },
                  tokens.shadow.floating
                ]}
              >
                <View style={styles.cardTop}>
                  <StatusPill label={status.label} tone={status.tone} />
                  <Text aria-hidden style={[styles.arrow, { color: theme.text }]}>
                    ↗
                  </Text>
                </View>
                <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.text }]}>
                  {group.title}
                </Text>
                <Text style={[styles.when, { color: theme.textMuted }]}>
                  {format(new Date(group.startsAt), 'EEE, MMM d · h:mm a')} ·{' '}
                  {formatDistanceToNowStrict(new Date(group.startsAt), {
                    addSuffix: true
                  })}
                </Text>

                <View style={styles.crewRow}>
                  <AvatarStack
                    members={group.members.map((member) => ({
                      id: member.id,
                      label: member.displayName
                    }))}
                  />
                  <View style={styles.progressCopy}>
                    <Text style={[styles.progressValue, { color: theme.text }]}>
                      {confirmedCount}/{group.members.length} confirmed
                    </Text>
                    <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
                      {group.venue ? 'Public venue revealed' : 'Venue stays locked'}
                    </Text>
                  </View>
                </View>

                {group.status === 'pending_confirmation' ? (
                  <View
                    style={[
                      styles.deadline,
                      {
                        backgroundColor: needsResponse
                          ? tokens.color.coralSoft
                          : theme.surfaceMuted
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.deadlineText,
                        { color: needsResponse ? '#8B2522' : theme.text }
                      ]}
                    >
                      {needsResponse
                        ? 'Your response is needed · '
                        : 'You’re confirmed · '}
                      deadline{' '}
                      {formatDistanceToNowStrict(new Date(group.confirmationDeadline), {
                        addSuffix: true
                      })}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon="↗"
          title="No crews yet"
          message="Swipe right on an activity. When enough compatible students join, your private crew appears here."
          actionLabel="Browse activities"
          onAction={() => router.replace('/deck')}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  navigation: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginBottom: tokens.space.lg
  },
  navButton: { flex: 1 },
  list: { gap: tokens.space.md },
  card: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  arrow: { fontSize: 21, fontWeight: tokens.weight.black },
  cardTitle: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.heading,
    lineHeight: tokens.lineHeight.heading,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.7
  },
  when: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.label,
    lineHeight: 20,
    fontWeight: tokens.weight.heavy
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.space.lg
  },
  progressCopy: { flex: 1, marginLeft: tokens.space.md },
  progressValue: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  progressLabel: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  deadline: {
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: tokens.space.md
  },
  deadlineText: {
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.black
  }
});
