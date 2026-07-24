import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatePanel } from '@/components/ui/state-panel';
import {
  useConfirmAttendance,
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

export default function GroupLobbyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const { theme } = useTheme();
  const lobby = useGroupLobby(groupId ?? '');
  const confirm = useConfirmAttendance(groupId ?? '');
  const leave = useLeaveGroup(groupId ?? '');
  const countdown = useCountdown(lobby.data?.confirmationDeadline);
  const currentMember = useMemo(
    () => lobby.data?.members.find((member) => member.id === user?.id),
    [lobby.data?.members, user?.id]
  );

  if (lobby.isLoading) return <LoadingScreen label="Opening the crew lobby…" />;
  if (lobby.isError || !lobby.data) {
    return (
      <AppScreen>
        <StatePanel
          icon="🔒"
          title="Lobby unavailable"
          message="You may no longer be an active member, or the connection was interrupted."
          actionLabel="Back to groups"
          onAction={() => router.replace('/groups')}
        />
      </AppScreen>
    );
  }

  const group = lobby.data;
  const isPending = group.status === 'pending_confirmation';
  const canConfirm = isPending && currentMember?.confirmation !== 'confirmed';

  const confirmLeave = () => {
    Alert.alert(
      'Leave this crew?',
      'Leaving within 24 hours of the activity can apply a −15 XP reliability penalty.',
      [
        { text: 'Stay', style: 'cancel' },
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
    <AppScreen
      eyebrow={group.status === 'confirmed' ? 'Crew confirmed' : 'Action needed'}
      title={group.title}
      subtitle={`${format(new Date(group.startsAt), 'EEEE, MMMM d · h:mm a')} · ${formatDistanceToNowStrict(new Date(group.startsAt), { addSuffix: true })}`}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/groups')}
        style={[styles.back, { backgroundColor: theme.surfaceMuted }]}
      >
        <Text style={[styles.backText, { color: theme.text }]}>← All groups</Text>
      </Pressable>

      {isPending ? (
        <View style={[styles.confirmCard, { borderColor: tokens.color.amber }]}>
          <Text style={[styles.confirmTitle, { color: theme.text }]}>
            Confirm you’re attending
          </Text>
          <Text style={[styles.countdown, { color: tokens.color.coral }]}>
            {countdown}
          </Text>
          <Text style={[styles.confirmCopy, { color: theme.textMuted }]}>
            The crew needs {group.members.length > 3 ? 'enough' : 'more'} responses before
            its staffed public meeting spot unlocks.
          </Text>
          {canConfirm ? (
            <PrimaryButton
              label="Yes, I’m attending"
              loading={confirm.isPending}
              onPress={() => confirm.mutate()}
              style={styles.confirmButton}
            />
          ) : (
            <Text style={[styles.confirmedText, { color: theme.success }]}>
              ✓ Your response is confirmed
            </Text>
          )}
          {confirm.isError ? (
            <Text accessibilityRole="alert" style={{ color: theme.danger }}>
              Confirmation failed. The deadline may have passed; refresh and try again.
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Crew · {group.members.length}
      </Text>
      <View style={styles.memberGrid}>
        {group.members.map((member) => (
          <Pressable
            key={member.id}
            accessibilityRole="button"
            accessibilityLabel={`${member.displayName}${member.isHost ? ', host' : ''}`}
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
            style={[
              styles.member,
              { backgroundColor: theme.surface, borderColor: theme.border }
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {member.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberCopy}>
              <Text numberOfLines={1} style={[styles.memberName, { color: theme.text }]}>
                {member.displayName}
                {member.isHost ? ' · Host' : ''}
              </Text>
              <Text
                style={[
                  styles.memberStatus,
                  {
                    color:
                      member.confirmation === 'confirmed'
                        ? theme.success
                        : theme.textMuted
                  }
                ]}
              >
                {member.confirmation === 'confirmed' ? '✓ Attending' : 'Awaiting reply'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View
        style={[
          styles.venue,
          { backgroundColor: theme.surface, borderColor: theme.border }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {group.venue ? 'Public meeting spot' : '🔒 Meeting spot locked'}
        </Text>
        {group.venue ? (
          <>
            <Text style={[styles.venueName, { color: theme.text }]}>
              {group.venue.name}
            </Text>
            <Text style={[styles.venueCopy, { color: theme.textMuted }]}>
              {group.venue.address}
            </Text>
            {group.venue.notes ? (
              <Text style={[styles.venueCopy, { color: theme.textMuted }]}>
                {group.venue.notes}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={[styles.venueCopy, { color: theme.textMuted }]}>
            Revealed only after the minimum crew size confirms. Campus Clash uses public,
            staffed venues—never private homes.
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Open group chat"
          onPress={() =>
            router.push({ pathname: '/group/[id]/chat', params: { id: group.id } })
          }
        />
        {group.status === 'confirmed' ? (
          <PrimaryButton
            label={currentMember?.isHost ? 'Show check-in QR' : 'Scan check-in QR'}
            variant="secondary"
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
        <PrimaryButton
          label="Leave group"
          variant="ghost"
          loading={leave.isPending}
          onPress={confirmLeave}
        />
        <PrimaryButton
          label="Report a group safety concern"
          variant="ghost"
          onPress={() =>
            router.push({ pathname: '/report', params: { groupId: group.id } })
          }
        />
      </View>
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
  confirmCard: {
    borderWidth: 2,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    marginBottom: tokens.space.xl
  },
  confirmTitle: { fontSize: 21, fontWeight: '900' },
  countdown: { marginTop: 5, fontSize: 18, fontWeight: '900' },
  confirmCopy: { marginTop: tokens.space.sm, fontSize: 14, lineHeight: 21 },
  confirmButton: { marginTop: tokens.space.md },
  confirmedText: { marginTop: tokens.space.md, fontSize: 15, fontWeight: '900' },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  memberGrid: { gap: tokens.space.sm, marginTop: tokens.space.md },
  member: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm
  },
  avatar: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15
  },
  avatarText: { fontSize: 20, fontWeight: '900' },
  memberCopy: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '900' },
  memberStatus: { marginTop: 3, fontSize: 12, fontWeight: '700' },
  venue: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    marginTop: tokens.space.xl
  },
  venueName: { marginTop: tokens.space.md, fontSize: 17, fontWeight: '900' },
  venueCopy: { marginTop: 5, fontSize: 14, lineHeight: 21 },
  actions: { gap: tokens.space.sm, marginTop: tokens.space.xl }
});
