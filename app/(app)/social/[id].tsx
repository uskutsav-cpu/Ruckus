import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import {
  useFollowProfile,
  useRemoveFriend,
  useSendFriendRequest,
  useSocialProfile,
  useUnfollowProfile
} from '@/features/social/use-social';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function SocialProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const profile = useSocialProfile(id ?? '');
  const follow = useFollowProfile(id ?? '');
  const unfollow = useUnfollowProfile(id ?? '');
  const friend = useSendFriendRequest(id ?? '');
  const remove = useRemoveFriend(id ?? '');
  const [notice, setNotice] = useState<string | null>(null);

  if (profile.isLoading) {
    return (
      <AppScreen>
        <BackButton label="Connections" />
        <ListCardSkeleton count={2} />
      </AppScreen>
    );
  }
  if (profile.isError || !profile.data) {
    return (
      <AppScreen>
        <BackButton label="Connections" />
        <ErrorState
          icon="lock"
          title="Profile unavailable"
          message="This member may be private, blocked, or no longer available."
          actionLabel="Back to connections"
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  const data = profile.data;
  const busy =
    follow.isPending || unfollow.isPending || friend.isPending || remove.isPending;
  const followPending = data.followStatus === 'pending';
  const friendPending = data.friendRequestStatus === 'pending';
  const onMutationError = () =>
    setNotice(
      'That action could not be completed. Your current connection is unchanged.'
    );
  const toggleFollow = () => {
    if (data.isFollowing) {
      unfollow.mutate(undefined, {
        onSuccess: () => setNotice('No longer following.'),
        onError: onMutationError
      });
      return;
    }
    follow.mutate(undefined, {
      onSuccess: (status) =>
        setNotice(status === 'pending' ? 'Follow request sent.' : 'Now following.'),
      onError: onMutationError
    });
  };
  const toggleFriend = () => {
    if (data.isFriend) {
      remove.mutate(undefined, {
        onSuccess: () => setNotice('Friend removed.'),
        onError: onMutationError
      });
      return;
    }
    friend.mutate(undefined, {
      onSuccess: (result) =>
        setNotice(
          result.status === 'accepted' ? 'You are now friends.' : 'Friend request sent.'
        ),
      onError: onMutationError
    });
  };

  return (
    <AppScreen
      eyebrow="Campus profile"
      title={data.displayName}
      subtitle={data.campusName}
    >
      <BackButton label="Connections" onPress={() => router.back()} />
      {notice ? <InlineNotice message={notice} /> : null}
      <View style={[styles.identity, { borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.accentMuted }]}>
          <Text style={[styles.initial, { color: theme.text }]}>
            {data.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{data.displayName}</Text>
        {data.username ? (
          <Text style={[styles.username, { color: theme.textMuted }]}>
            @{data.username}
          </Text>
        ) : null}
        {data.bio ? (
          <Text style={[styles.bio, { color: theme.textMuted }]}>{data.bio}</Text>
        ) : null}
        <View style={styles.signals}>
          <Signal icon="people" label={`${data.mutualFriends} mutual`} />
          {data.followsYou ? <Signal icon="check" label="Follows you" /> : null}
          {data.isFriend ? <Signal icon="check" label="Friend" /> : null}
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={data.isFollowing ? 'Following' : followPending ? 'Requested' : 'Follow'}
          leadingIcon={data.isFollowing ? 'check' : 'add'}
          variant={data.isFollowing || followPending ? 'secondary' : 'primary'}
          loading={follow.isPending || unfollow.isPending}
          disabled={followPending || (busy && !follow.isPending && !unfollow.isPending)}
          onPress={toggleFollow}
          style={styles.flex}
        />
        <SecondaryButton
          label={
            data.isFriend
              ? 'Remove friend'
              : friendPending
                ? data.friendRequestDirection === 'incoming'
                  ? 'Review request'
                  : 'Requested'
                : 'Add friend'
          }
          leadingIcon={data.isFriend ? 'remove' : 'people'}
          loading={friend.isPending || remove.isPending}
          disabled={friendPending || (busy && !friend.isPending && !remove.isPending)}
          onPress={toggleFriend}
          style={styles.flex}
        />
      </View>
      <InlineNotice message="Blocking is available from the report flow and immediately removes follows, requests, and friendship in both directions." />
    </AppScreen>
  );
}

function Signal({ icon, label }: { icon: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.signal, { backgroundColor: theme.surfaceMuted }]}>
      <AppIcon name={icon} color={theme.textMuted} size={15} />
      <Text style={[styles.signalText, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.xl
  },
  avatar: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill
  },
  initial: { fontSize: 36, fontWeight: tokens.weight.bold },
  name: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.title,
    fontWeight: tokens.weight.bold
  },
  username: { marginTop: 3, fontSize: tokens.type.label },
  bio: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    textAlign: 'center'
  },
  signals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: tokens.space.sm,
    marginTop: tokens.space.lg
  },
  signal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs
  },
  signalText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.medium },
  actions: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginVertical: tokens.space.lg
  },
  flex: { flex: 1 }
});
