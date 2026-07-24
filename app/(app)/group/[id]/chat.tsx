import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { format, isSameDay } from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatusPill } from '@/components/ui/status-pill';
import type { ChatMessage, OutboxMessage } from '@/features/groups/group-types';
import { useChat, useGroupLobby } from '@/features/groups/use-groups';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

function isOutbox(message: ChatMessage | OutboxMessage): message is OutboxMessage {
  return 'delivery' in message;
}

function sendErrorMessage(error: unknown): string | null {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes('rate')) {
    return 'You’re sending too quickly. Pause for a moment, then retry.';
  }
  return 'That message didn’t send. Tap its failed status to retry.';
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const { theme } = useTheme();
  const network = useNetInfo();
  const lobby = useGroupLobby(groupId ?? '');
  const chat = useChat(groupId ?? '');
  const [draft, setDraft] = useState('');
  const memberNames = useMemo(
    () =>
      new Map(
        (lobby.data?.members ?? []).map((member) => [member.id, member.displayName])
      ),
    [lobby.data?.members]
  );

  if (chat.isLoading || lobby.isLoading) return <LoadingScreen label="Joining chat…" />;
  if (!groupId || chat.isError || lobby.isError || !lobby.data) {
    return (
      <AppScreen>
        <ErrorState
          icon="×"
          title="Private chat unavailable"
          message="Only active crew members can open this conversation. Your previous messages remain protected."
          actionLabel="Back to crews"
          onAction={() => router.replace('/groups')}
        />
      </AppScreen>
    );
  }

  const online = network.isConnected !== false;
  const canSend = Boolean(draft.trim() && online && !chat.isSending);
  const mutationMessage = sendErrorMessage(chat.sendError);

  const send = () => {
    if (!canSend) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    chat.send(draft);
    setDraft('');
  };

  return (
    <AppScreen
      scroll={false}
      contentStyle={styles.screen}
      footer={
        <View>
          {mutationMessage ? (
            <InlineNotice tone="error" icon="!" message={mutationMessage} />
          ) : null}
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Message your crew"
              accessibilityHint={
                online
                  ? 'Messages are visible only to active group members'
                  : 'Reconnect before sending'
              }
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              placeholder={online ? 'Message your crew' : 'Reconnect to send'}
              placeholderTextColor={theme.textSubtle}
              selectionColor={theme.accent}
              editable={online}
              maxLength={1000}
              multiline
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                  color: theme.text
                }
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={send}
              style={({ pressed }) => [
                styles.send,
                {
                  backgroundColor: theme.primary,
                  opacity: canSend ? (pressed ? 0.7 : 1) : 0.36
                }
              ]}
            >
              {chat.isSending ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Text style={[styles.sendText, { color: theme.onPrimary }]}>↑</Text>
              )}
            </Pressable>
          </View>
        </View>
      }
    >
      <BackButton
        label="Crew lobby"
        onPress={() =>
          router.replace({ pathname: '/group/[id]', params: { id: groupId } })
        }
      />

      <View
        style={[
          styles.context,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
        ]}
      >
        <StatusPill label="PRIVATE CREW CHAT" tone="success" />
        <Text numberOfLines={2} style={[styles.title, { color: theme.text }]}>
          {lobby.data.title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {lobby.data.members.length} members · Only active crew members can read this
        </Text>
      </View>

      {!online ? (
        <InlineNotice
          icon="↯"
          tone="offline"
          message="Offline — saved messages remain visible, but sending and loading older messages are paused."
        />
      ) : (
        <InlineNotice
          icon="!"
          message="Long-press someone else’s message to report it privately."
        />
      )}

      <FlatList
        accessibilityRole="list"
        inverted
        data={chat.data}
        keyExtractor={(message) => message.id}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.35}
        onEndReached={() => {
          if (online && chat.hasNextPage && !chat.isFetchingNextPage) {
            void chat.fetchNextPage();
          }
        }}
        ListFooterComponent={
          chat.isFetchingNextPage ? (
            <View style={styles.loadingOlder}>
              <ActivityIndicator color={theme.accent} />
              <Text style={[styles.loadingOlderText, { color: theme.textMuted }]}>
                Loading earlier messages…
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="↗"
            title="Start the crew chat"
            message="Say hello or coordinate what to bring. Keep every meetup at the revealed public venue."
          />
        }
        renderItem={({ item, index }) => {
          const nextMessage = chat.data[index + 1];
          const showDate =
            !nextMessage ||
            !isSameDay(new Date(item.createdAt), new Date(nextMessage.createdAt));

          if (item.kind === 'system') {
            return (
              <View>
                <View style={[styles.system, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.systemMark, { color: theme.accent }]}>R</Text>
                  <Text style={[styles.systemText, { color: theme.textMuted }]}>
                    {item.body}
                  </Text>
                </View>
                {showDate ? (
                  <Text style={[styles.dateDivider, { color: theme.textSubtle }]}>
                    {format(new Date(item.createdAt), 'EEEE, MMM d')}
                  </Text>
                ) : null}
              </View>
            );
          }

          const mine = item.senderId === user?.id;
          const pending = isOutbox(item);
          return (
            <View>
              <Pressable
                accessibilityRole="text"
                accessibilityLabel={`${mine ? 'You' : item.senderId ? (memberNames.get(item.senderId) ?? 'Crew member') : 'Crew member'} said ${item.body}. ${format(new Date(item.createdAt), 'h:mm a')}`}
                accessibilityHint={
                  mine ? undefined : 'Long-press to report this message privately'
                }
                onLongPress={
                  mine
                    ? undefined
                    : () =>
                        router.push({
                          pathname: '/report',
                          params: {
                            messageId: item.id,
                            groupId,
                            ...(item.senderId ? { userId: item.senderId } : {})
                          }
                        })
                }
                style={[styles.messageRow, mine ? styles.mineRow : styles.theirRow]}
              >
                {!mine ? (
                  <View style={styles.senderRow}>
                    <View
                      style={[
                        styles.senderAvatar,
                        { backgroundColor: theme.accentMuted }
                      ]}
                    >
                      <Text style={[styles.senderInitial, { color: theme.text }]}>
                        {item.senderId
                          ? (memberNames.get(item.senderId) ?? 'C')
                              .slice(0, 1)
                              .toUpperCase()
                          : 'C'}
                      </Text>
                    </View>
                    <Text style={[styles.sender, { color: theme.accent }]}>
                      {item.senderId
                        ? (memberNames.get(item.senderId) ?? 'Crew member')
                        : 'Crew member'}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.mineBubble : styles.theirBubble,
                    {
                      backgroundColor: mine ? theme.primary : theme.surfaceElevated,
                      borderColor: mine ? theme.primary : theme.border
                    }
                  ]}
                >
                  <Text
                    style={[styles.body, { color: mine ? theme.onPrimary : theme.text }]}
                  >
                    {item.body}
                  </Text>
                </View>
                <View style={styles.metadata}>
                  <Text style={[styles.time, { color: theme.textSubtle }]}>
                    {format(new Date(item.createdAt), 'h:mm a')}
                  </Text>
                  {pending ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.delivery === 'failed'
                          ? 'Message failed. Retry'
                          : 'Message sending'
                      }
                      disabled={item.delivery === 'sending' || !online}
                      onPress={() => chat.retry(item)}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.delivery,
                          {
                            color:
                              item.delivery === 'failed' ? theme.danger : theme.textMuted
                          }
                        ]}
                      >
                        {item.delivery === 'failed'
                          ? online
                            ? 'Failed · tap to retry'
                            : 'Failed · reconnect to retry'
                          : 'Sending…'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
              {showDate ? (
                <Text style={[styles.dateDivider, { color: theme.textSubtle }]}>
                  {format(new Date(item.createdAt), 'EEEE, MMM d')}
                </Text>
              ) : null}
            </View>
          );
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  context: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    marginBottom: tokens.space.md
  },
  title: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.heading,
    lineHeight: tokens.lineHeight.heading,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.6
  },
  subtitle: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  list: { flexGrow: 1, paddingVertical: tokens.space.sm },
  loadingOlder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space.md
  },
  loadingOlderText: {
    marginLeft: tokens.space.sm,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.heavy
  },
  system: {
    maxWidth: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    marginVertical: tokens.space.sm
  },
  systemMark: {
    marginRight: tokens.space.sm,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.black
  },
  systemText: {
    flex: 1,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.heavy
  },
  dateDivider: {
    alignSelf: 'center',
    marginVertical: tokens.space.md,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.black,
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  messageRow: { maxWidth: '84%', marginVertical: 6 },
  mineRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  senderAvatar: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill
  },
  senderInitial: { fontSize: 9, fontWeight: tokens.weight.black },
  sender: {
    marginLeft: 6,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.black
  },
  bubble: {
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 11
  },
  mineBubble: {
    borderTopLeftRadius: tokens.radius.md,
    borderTopRightRadius: tokens.radius.xs,
    borderBottomRightRadius: tokens.radius.md,
    borderBottomLeftRadius: tokens.radius.md
  },
  theirBubble: {
    borderTopLeftRadius: tokens.radius.xs,
    borderTopRightRadius: tokens.radius.md,
    borderBottomRightRadius: tokens.radius.md,
    borderBottomLeftRadius: tokens.radius.md
  },
  body: {
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.medium
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginTop: 4
  },
  time: { fontSize: 10, fontWeight: tokens.weight.heavy },
  delivery: { fontSize: 10, fontWeight: tokens.weight.black },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.space.sm
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    flex: 1,
    borderWidth: 1.5,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 12,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.medium
  },
  send: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md
  },
  sendText: { fontSize: 24, fontWeight: tokens.weight.black }
});
