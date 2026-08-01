import { useMemo, useState } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { SocialConnection, SocialSuggestion } from '@/features/social/social-types';
import {
  useRespondToFollowRequest,
  useRespondToFriendRequest,
  useSocialConnections,
  useSocialOverview,
  useSocialSuggestions
} from '@/features/social/use-social';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type SocialTab = 'suggested' | 'friends' | 'requests';

const tabs = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'friends', label: 'Friends' },
  { value: 'requests', label: 'Requests' }
] as const;

export default function SocialScreen() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<SocialTab>('suggested');
  const overview = useSocialOverview();
  const suggestions = useSocialSuggestions();
  const friends = useSocialConnections('friends');
  const friendRequests = useSocialConnections('friend_requests');
  const followRequests = useSocialConnections('follow_requests');
  const respondFriend = useRespondToFriendRequest();
  const respondFollow = useRespondToFollowRequest();
  const [notice, setNotice] = useState<string | null>(null);

  const suggestedItems = useMemo(
    () => suggestions.data?.pages.flatMap((page) => page.items) ?? [],
    [suggestions.data]
  );
  const friendItems = useMemo(
    () => friends.data?.pages.flatMap((page) => page.items) ?? [],
    [friends.data]
  );
  const requestItems = useMemo(
    () => [
      ...(friendRequests.data?.pages.flatMap((page) => page.items) ?? []),
      ...(followRequests.data?.pages.flatMap((page) => page.items) ?? [])
    ],
    [followRequests.data, friendRequests.data]
  );
  const activeQuery =
    tab === 'suggested' ? suggestions : tab === 'friends' ? friends : friendRequests;
  const activeCount =
    tab === 'suggested'
      ? suggestedItems.length
      : tab === 'friends'
        ? friendItems.length
        : requestItems.length;
  const isRequestBusy = respondFriend.isPending || respondFollow.isPending;
  const counts = overview.data?.counts;

  const respond = (item: SocialConnection, accept: boolean) => {
    const onSuccess = () =>
      setNotice(accept ? 'Connection accepted.' : 'Request declined.');
    const onError = () => setNotice('That request changed or is no longer available.');
    if (item.relation === 'friend_request' && item.requestId) {
      respondFriend.mutate({ requestId: item.requestId, accept }, { onSuccess, onError });
    } else {
      respondFollow.mutate(
        { profileId: item.profileId, accept },
        {
          onSuccess,
          onError
        }
      );
    }
  };

  return (
    <AppScreen
      eyebrow="Campus community"
      title="Connections"
      subtitle="Find people through privacy-safe campus signals and control every connection."
    >
      <View style={styles.topRow}>
        <BackButton label="Profile" onPress={() => router.back()} />
        <SecondaryButton
          label="Privacy"
          leadingIcon="lock"
          onPress={() => router.push('/social-privacy' as Href)}
          style={styles.privacyButton}
        />
      </View>

      {notice ? <InlineNotice message={notice} /> : null}
      {overview.isError ? (
        <InlineNotice
          tone="error"
          message="Connection totals are temporarily unavailable. No settings changed."
        />
      ) : null}
      <View style={styles.metrics} accessibilityRole="summary">
        <Metric label="Friends" value={counts?.friends} />
        <Metric label="Following" value={counts?.following} />
        <Metric label="Followers" value={counts?.followers} />
      </View>

      <SegmentedControl
        accessibilityLabel="Connection view"
        value={tab}
        options={tabs}
        onChange={(value) => {
          setNotice(null);
          setTab(value);
        }}
      />

      {tab === 'requests' && counts ? (
        <Text style={[styles.requestSummary, { color: theme.textMuted }]}>
          {counts.incomingFriendRequests} friend · {counts.incomingFollowRequests} follow
        </Text>
      ) : null}

      {activeQuery.isLoading ? <ListCardSkeleton count={3} /> : null}
      {activeQuery.isError || (tab === 'requests' && followRequests.isError) ? (
        <ErrorState
          title="Connections unavailable"
          message="Your relationships are unchanged. Try again."
          actionLabel="Try again"
          onAction={() => {
            void activeQuery.refetch();
            if (tab === 'requests') void followRequests.refetch();
          }}
        />
      ) : null}
      {!activeQuery.isLoading && !activeQuery.isError && activeCount === 0 ? (
        <EmptyState
          icon="people"
          title={tab === 'requests' ? 'No requests waiting' : `No ${tab} yet`}
          message={
            tab === 'suggested'
              ? 'Suggestions appear only when other verified campus members opt in.'
              : tab === 'friends'
                ? 'Mutual friend requests become a friendship.'
                : 'New friend and follow approvals will appear here.'
          }
        />
      ) : null}

      <View accessibilityRole="list" style={styles.list}>
        {tab === 'suggested'
          ? suggestedItems.map((item) => (
              <SuggestionRow key={item.profileId} item={item} />
            ))
          : (tab === 'friends' ? friendItems : requestItems).map((item) => (
              <ConnectionRow
                key={`${item.relation}:${item.profileId}`}
                item={item as SocialConnection}
                showDecision={tab === 'requests'}
                busy={isRequestBusy}
                onRespond={respond}
              />
            ))}
      </View>

      {tab === 'suggested' && suggestions.hasNextPage ? (
        <SecondaryButton
          label="Load more"
          loading={suggestions.isFetchingNextPage}
          onPress={() => void suggestions.fetchNextPage()}
        />
      ) : null}
      {tab === 'friends' && friends.hasNextPage ? (
        <SecondaryButton
          label="Load more"
          loading={friends.isFetchingNextPage}
          onPress={() => void friends.fetchNextPage()}
        />
      ) : null}
    </AppScreen>
  );
}

function Metric({ label, value }: { label: string; value: number | undefined }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.metric, { borderColor: theme.border }]}>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value ?? '—'}</Text>
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function PersonBase({
  profileId,
  displayName,
  username,
  detail,
  children
}: {
  profileId: string;
  displayName: string;
  username: string | null;
  detail: string;
  children?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.personCard, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${displayName}`}
        onPress={() => router.push(`/social/${profileId}` as Href)}
        style={({ pressed }) => [styles.personMain, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.avatar, { backgroundColor: theme.accentMuted }]}>
          <Text style={[styles.initial, { color: theme.text }]}>
            {displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.personCopy}>
          <Text style={[styles.personName, { color: theme.text }]}>{displayName}</Text>
          <Text style={[styles.personMeta, { color: theme.textMuted }]}>
            {username ? `@${username} · ` : ''}
            {detail}
          </Text>
        </View>
        <AppIcon name="forward" color={theme.textSubtle} size={17} />
      </Pressable>
      {children}
    </View>
  );
}

function SuggestionRow({ item }: { item: SocialSuggestion }) {
  return (
    <PersonBase
      profileId={item.profileId}
      displayName={item.displayName}
      username={item.username}
      detail={item.explanation}
    />
  );
}

function ConnectionRow({
  item,
  showDecision,
  busy,
  onRespond
}: {
  item: SocialConnection;
  showDecision: boolean;
  busy: boolean;
  onRespond: (item: SocialConnection, accept: boolean) => void;
}) {
  const detail =
    item.relation === 'friend_request'
      ? 'Wants to be friends'
      : item.relation === 'follow_request'
        ? 'Wants to follow you'
        : item.relation.replace('_', ' ');
  return (
    <PersonBase
      profileId={item.profileId}
      displayName={item.displayName}
      username={item.username}
      detail={detail}
    >
      {showDecision ? (
        <View style={styles.decisionRow}>
          <PrimaryButton
            label="Accept"
            disabled={busy}
            onPress={() => onRespond(item, true)}
            style={styles.flex}
          />
          <SecondaryButton
            label="Decline"
            disabled={busy}
            onPress={() => onRespond(item, false)}
            style={styles.flex}
          />
        </View>
      ) : null}
    </PersonBase>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  privacyButton: { minWidth: 126 },
  metrics: { flexDirection: 'row', gap: tokens.space.sm, marginBottom: tokens.space.lg },
  metric: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    padding: tokens.space.md
  },
  metricValue: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  metricLabel: { marginTop: 2, fontSize: tokens.type.caption },
  requestSummary: { marginTop: tokens.space.md, fontSize: tokens.type.caption },
  list: {
    gap: tokens.space.sm,
    marginTop: tokens.space.lg,
    marginBottom: tokens.space.md
  },
  personCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  personMain: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill
  },
  initial: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  personCopy: { flex: 1, marginHorizontal: tokens.space.md },
  personName: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  personMeta: { marginTop: 3, fontSize: tokens.type.caption },
  decisionRow: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.md },
  flex: { flex: 1 }
});
