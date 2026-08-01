import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { StatusPill } from '@/components/ui/status-pill';
import type { GroupLobby } from '@/features/groups/group-types';
import {
  useConfirmAttendance,
  useFinalizeGroup,
  useGroupLobby,
  useLeaveGroup
} from '@/features/groups/use-groups';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

function useCountdown(deadline?: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!deadline) return '';
  const milliseconds = new Date(deadline).getTime() - now;
  if (milliseconds <= 0) return 'Deadline passed';
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
}

function statusForGroup(group: GroupLobby) {
  if (group.status === 'confirmed') {
    return { label: 'Confirmed', tone: 'success' as const };
  }
  if (group.status === 'pending_confirmation') {
    return { label: 'Confirmation open', tone: 'warning' as const };
  }
  if (group.status === 'completed') {
    return { label: 'Completed', tone: 'neutral' as const };
  }
  if (group.status === 'cancelled') {
    return { label: 'Cancelled', tone: 'warning' as const };
  }
  return { label: 'Forming', tone: 'accent' as const };
}

export default function GroupLobbyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const { theme } = useTheme();
  const network = useNetInfo();
  const lobby = useGroupLobby(groupId ?? '');
  const confirm = useConfirmAttendance(groupId ?? '');
  const leave = useLeaveGroup(groupId ?? '');
  const finalize = useFinalizeGroup(groupId ?? '');
  const countdown = useCountdown(lobby.data?.confirmationDeadline);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const currentMember = useMemo(
    () => lobby.data?.members.find((member) => member.id === user?.id),
    [lobby.data?.members, user?.id]
  );

  if (lobby.isLoading) return <LoadingScreen label="Opening group…" />;
  if (lobby.isError || !lobby.data) {
    return (
      <AppScreen>
        <ErrorState
          icon="×"
          title="This group isn’t available"
          message="You may have been removed, the group may have expired, or your connection was interrupted."
          actionLabel="Back to groups"
          onAction={() => router.replace('/groups')}
        />
      </AppScreen>
    );
  }

  const group = lobby.data;
  const status = statusForGroup(group);
  const isPending = group.status === 'pending_confirmation';
  const isInactive = group.status === 'cancelled' || group.status === 'completed';
  const canConfirm =
    isPending &&
    currentMember?.confirmation !== 'confirmed' &&
    currentMember?.confirmation !== 'expired' &&
    currentMember?.confirmation !== 'declined';
  const confirmedCount = group.members.filter(
    (member) => member.confirmation === 'confirmed'
  ).length;
  const canFinalize =
    group.status === 'confirmed' &&
    currentMember?.isHost === true &&
    new Date(group.endsAt).getTime() < currentTime;

  const confirmLeave = () => {
    Alert.alert(
      'Leave this group?',
      'Leaving within 24 hours of the activity can apply the existing −15 XP reliability penalty.',
      [
        { text: 'Stay in group', style: 'cancel' },
        {
          text: 'Leave group',
          style: 'destructive',
          onPress: () =>
            leave.mutate(undefined, {
              onSuccess: () => router.replace('/groups')
            })
        }
      ]
    );
  };

  return (
    <AppScreen>
      <BackButton label="All groups" onPress={() => router.replace('/groups')} />

      {network.isConnected === false ? (
        <InlineNotice
          icon="↯"
          tone="offline"
          message="Offline — confirmations, chat, and venue updates need a connection."
        />
      ) : null}

      <View style={styles.hero}>
        <StatusPill label={status.label} tone={status.tone} />
        <Text style={[styles.title, { color: theme.text }]}>{group.title}</Text>
        <Text style={[styles.when, { color: theme.textMuted }]}>
          {format(new Date(group.startsAt), 'EEEE, MMMM d · h:mm a')}
        </Text>
        <Text style={[styles.distance, { color: theme.accent }]}>
          {formatDistanceToNowStrict(new Date(group.startsAt), { addSuffix: true })}
        </Text>
      </View>

      {group.status === 'cancelled' ? (
        <InlineNotice
          tone="error"
          icon="!"
          message="This group was cancelled. Chat, venue, and check-in actions are closed."
        />
      ) : group.status === 'completed' ? (
        <InlineNotice
          icon="✓"
          message="This activity is complete. Your verified attendance and XP history remain on your profile."
        />
      ) : null}

      {isPending ? (
        <View
          style={[
            styles.confirmCard,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: canConfirm ? theme.warning : theme.border
            }
          ]}
        >
          <View style={styles.confirmTop}>
            <View style={styles.confirmCopyWrap}>
              <Text style={[styles.confirmTitle, { color: theme.text }]}>
                {canConfirm ? 'Hold your spot' : 'Your spot is held'}
              </Text>
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.countdown, { color: theme.danger }]}
              >
                {countdown}
              </Text>
            </View>
            <View style={[styles.confirmCount, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.confirmCountValue, { color: theme.text }]}>
                {confirmedCount}/{group.members.length}
              </Text>
              <Text style={[styles.confirmCountLabel, { color: theme.textMuted }]}>
                confirmed
              </Text>
            </View>
          </View>
          <View
            accessibilityLabel={`${confirmedCount} of ${group.members.length} members confirmed`}
            style={styles.segments}
          >
            {group.members.map((member) => (
              <View
                key={member.id}
                style={[
                  styles.segment,
                  {
                    backgroundColor:
                      member.confirmation === 'confirmed'
                        ? theme.primary
                        : theme.surfaceStrong
                  }
                ]}
              />
            ))}
          </View>
          <Text style={[styles.confirmBody, { color: theme.textMuted }]}>
            The meeting venue appears after the group reaches its confirmation threshold.
          </Text>
          {canConfirm ? (
            <PrimaryButton
              label="Yes, I’m attending"
              leadingIcon="✓"
              loading={confirm.isPending}
              disabled={network.isConnected === false}
              onPress={() => confirm.mutate()}
              style={styles.confirmButton}
            />
          ) : (
            <StatusPill
              label={
                currentMember?.confirmation === 'confirmed'
                  ? 'You confirmed'
                  : 'Response closed'
              }
              tone={currentMember?.confirmation === 'confirmed' ? 'success' : 'neutral'}
              style={styles.confirmedPill}
            />
          )}
          {confirm.isError ? (
            <InlineNotice
              tone="error"
              icon="!"
              message="Confirmation failed. The deadline may have passed; refresh and try again."
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionEyebrow, { color: theme.textMuted }]}>
            Group members
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {group.members.length} members
          </Text>
        </View>
        <Text style={[styles.sectionMeta, { color: theme.textMuted }]}>
          {confirmedCount} attending
        </Text>
      </View>

      <View accessibilityRole="list" style={styles.memberGrid}>
        {group.members.map((member) => (
          <Pressable
            key={member.id}
            accessibilityRole="button"
            accessibilityLabel={`${member.displayName}${member.isHost ? ', host' : ''}. ${
              member.confirmation === 'confirmed'
                ? 'Attending'
                : member.confirmation === 'declined'
                  ? 'Declined'
                  : 'Awaiting response'
            }`}
            accessibilityHint={
              member.id === user?.id ? undefined : 'Long-press to report or block'
            }
            onLongPress={
              member.id === user?.id
                ? undefined
                : () =>
                    router.push({
                      pathname: '/report',
                      params: { userId: member.id, groupId: group.id }
                    })
            }
            style={({ pressed }) => [
              styles.member,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
                opacity: pressed ? 0.72 : 1
              }
            ]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: member.isHost ? theme.accentMuted : theme.surfaceMuted
                }
              ]}
            >
              <Text style={[styles.avatarText, { color: theme.text }]}>
                {member.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberCopy}>
              <View style={styles.memberNameRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.memberName, { color: theme.text }]}
                >
                  {member.displayName}
                </Text>
                {member.isHost ? (
                  <Text style={[styles.host, { color: theme.textMuted }]}>Host</Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.memberStatus,
                  {
                    color:
                      member.confirmation === 'confirmed'
                        ? theme.success
                        : member.confirmation === 'declined'
                          ? theme.danger
                          : theme.textMuted
                  }
                ]}
              >
                {member.confirmation === 'confirmed'
                  ? 'Attending'
                  : member.confirmation === 'declined'
                    ? 'Not attending'
                    : member.confirmation === 'expired'
                      ? 'Response expired'
                      : 'Awaiting response'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View
        style={[
          styles.venue,
          {
            backgroundColor: theme.surfaceMuted
          }
        ]}
      >
        <View style={styles.venueHeading}>
          <View
            style={[
              styles.venueIcon,
              { backgroundColor: group.venue ? theme.primary : theme.surfaceStrong }
            ]}
          >
            <AppIcon
              color={group.venue ? theme.primary : theme.textMuted}
              name={group.venue ? 'location' : 'clock'}
              size={20}
            />
          </View>
          <View style={styles.venueTitleWrap}>
            <Text style={[styles.sectionEyebrow, { color: theme.textMuted }]}>
              Meeting venue
            </Text>
            <Text style={[styles.venueTitle, { color: theme.text }]}>
              {group.venue ? 'Venue available' : 'Pending confirmation'}
            </Text>
          </View>
        </View>
        {group.venue ? (
          <>
            <Text style={[styles.venueName, { color: theme.text }]}>
              {group.venue.name}
            </Text>
            <Text style={[styles.venueBody, { color: theme.textMuted }]}>
              {group.venue.address}
            </Text>
            {group.venue.notes ? (
              <Text style={[styles.venueBody, { color: theme.textMuted }]}>
                {group.venue.notes}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={[styles.venueBody, { color: theme.textMuted }]}>
            The exact venue appears after the group reaches its confirmation threshold.
            Approved venues are public and staffed.
          </Text>
        )}
      </View>

      {!isInactive ? (
        <View style={styles.actions}>
          <PrimaryButton
            label="Open group chat"
            leadingIcon="chat"
            onPress={() =>
              router.push({ pathname: '/group/[id]/chat', params: { id: group.id } })
            }
          />
          {group.status === 'confirmed' ? (
            <SecondaryButton
              label={currentMember?.isHost ? 'Show check-in QR' : 'Scan check-in QR'}
              leadingIcon="⌁"
              onPress={() =>
                currentMember?.isHost
                  ? router.push({
                      pathname: '/group/[id]/host-check-in',
                      params: { id: group.id }
                    })
                  : router.push({
                      pathname: '/check-in/[groupId]',
                      params: { groupId: group.id }
                    })
              }
            />
          ) : null}
          {canFinalize ? (
            <SecondaryButton
              label="Finalize attendance"
              leadingIcon="✓"
              loading={finalize.isPending}
              onPress={() =>
                finalize.mutate(undefined, {
                  onSuccess: (result) =>
                    Alert.alert(
                      'Attendance finalized',
                      `${result.checkedInCount} verified check-ins · ${result.noShowCount} no-show ledger entries.`
                    )
                })
              }
            />
          ) : null}
          {finalize.isError ? (
            <InlineNotice
              tone="error"
              icon="!"
              message="Attendance could not be finalized. Refresh the lobby and try again."
            />
          ) : null}
        </View>
      ) : null}

      <View style={[styles.safetyActions, { borderTopColor: theme.border }]}>
        {!isInactive ? (
          <PrimaryButton
            label="Leave this group"
            variant="ghost"
            loading={leave.isPending}
            onPress={confirmLeave}
          />
        ) : null}
        <PrimaryButton
          label="Report a safety concern"
          variant="ghost"
          onPress={() =>
            router.push({ pathname: '/report', params: { groupId: group.id } })
          }
        />
        {leave.isError ? (
          <InlineNotice
            tone="error"
            icon="!"
            message="The group could not be left. Your membership has not changed."
          />
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: tokens.space.lg
  },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.bold,
    letterSpacing: -0.6
  },
  when: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    fontWeight: tokens.weight.medium
  },
  distance: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  confirmCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginBottom: tokens.space.xl
  },
  confirmTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.space.md
  },
  confirmCopyWrap: { flex: 1 },
  confirmTitle: { fontSize: 20, fontWeight: tokens.weight.bold },
  countdown: {
    marginTop: tokens.space.xs,
    fontSize: 17,
    fontWeight: tokens.weight.bold
  },
  confirmCount: {
    minWidth: 76,
    alignItems: 'center',
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm
  },
  confirmCountValue: { fontSize: 18, fontWeight: tokens.weight.bold },
  confirmCountLabel: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.medium
  },
  segments: {
    flexDirection: 'row',
    gap: tokens.space.xs,
    marginTop: tokens.space.lg
  },
  segment: { height: 8, flex: 1, borderRadius: tokens.radius.pill },
  confirmBody: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.regular
  },
  confirmButton: { marginTop: tokens.space.md },
  confirmedPill: { marginTop: tokens.space.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  sectionEyebrow: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.medium
  },
  sectionTitle: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold,
    letterSpacing: -0.3
  },
  sectionMeta: { fontSize: tokens.type.caption, fontWeight: tokens.weight.heavy },
  memberGrid: { marginTop: tokens.space.sm },
  member: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: tokens.space.sm
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  avatarText: { fontSize: 18, fontWeight: tokens.weight.bold },
  memberCopy: { flex: 1, marginLeft: tokens.space.md },
  memberNameRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: tokens.weight.bold
  },
  host: {
    marginLeft: tokens.space.sm,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  memberStatus: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  venue: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.xl
  },
  venueHeading: { flexDirection: 'row', alignItems: 'center' },
  venueIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  venueTitleWrap: { flex: 1, marginLeft: tokens.space.md },
  venueTitle: {
    marginTop: tokens.space.xs,
    fontSize: 17,
    fontWeight: tokens.weight.bold
  },
  venueName: {
    marginTop: tokens.space.lg,
    fontSize: 19,
    fontWeight: tokens.weight.bold
  },
  venueBody: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.regular
  },
  actions: { gap: tokens.space.sm, marginTop: tokens.space.xl },
  safetyActions: {
    gap: tokens.space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: tokens.space.xl,
    paddingTop: tokens.space.md
  }
});
