import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatePanel } from '@/components/ui/state-panel';
import type { ChatMessage, OutboxMessage } from '@/features/groups/group-types';
import { useChat, useGroupLobby } from '@/features/groups/use-groups';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

function isOutbox(message: ChatMessage | OutboxMessage): message is OutboxMessage {
  return 'delivery' in message;
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const { theme } = useTheme();
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
  if (!groupId || chat.isError || lobby.isError) {
    return (
      <AppScreen>
        <StatePanel
          icon="💬"
          title="Chat unavailable"
          message="Only active crew members can open this private chat."
          actionLabel="Back to groups"
          onAction={() => router.replace('/groups')}
        />
      </AppScreen>
    );
  }

  const send = () => {
    if (!draft.trim()) return;
    chat.send(draft);
    setDraft('');
  };

  return (
    <AppScreen
      scroll={false}
      eyebrow="Private crew chat"
      title={lobby.data?.title ?? 'Group chat'}
      subtitle="Long-press a message to report it. Your report is never posted to the chat."
      footer={
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Message"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="Message your crew"
            placeholderTextColor={theme.textMuted}
            maxLength={1000}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text
              }
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={!draft.trim()}
            onPress={send}
            style={[
              styles.send,
              {
                backgroundColor: theme.primary,
                opacity: draft.trim() ? 1 : 0.4
              }
            ]}
          >
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      }
    >
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.replace({ pathname: '/group/[id]', params: { id: groupId } })
        }
        style={[styles.back, { backgroundColor: theme.surfaceMuted }]}
      >
        <Text style={[styles.backText, { color: theme.text }]}>← Lobby</Text>
      </Pressable>
      <FlatList
        inverted
        data={chat.data}
        keyExtractor={(message) => message.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (chat.hasNextPage && !chat.isFetchingNextPage) {
            void chat.fetchNextPage();
          }
        }}
        renderItem={({ item }) => {
          if (item.kind === 'system') {
            return (
              <View style={[styles.system, { backgroundColor: theme.surfaceMuted }]}>
                <Text style={[styles.systemText, { color: theme.textMuted }]}>
                  {item.body}
                </Text>
              </View>
            );
          }
          const mine = item.senderId === user?.id;
          const pending = isOutbox(item);
          return (
            <Pressable
              accessibilityRole="text"
              accessibilityHint={mine ? undefined : 'Long-press to report this message'}
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
                <Text style={[styles.sender, { color: theme.primary }]}>
                  {item.senderId ? (memberNames.get(item.senderId) ?? 'Crew member') : ''}
                </Text>
              ) : null}
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: mine ? theme.primary : theme.surface,
                    borderColor: mine ? theme.primary : theme.border
                  }
                ]}
              >
                <Text style={[styles.body, { color: mine ? '#FFFFFF' : theme.text }]}>
                  {item.body}
                </Text>
              </View>
              <View style={styles.metadata}>
                <Text style={[styles.time, { color: theme.textMuted }]}>
                  {format(new Date(item.createdAt), 'h:mm a')}
                </Text>
                {pending ? (
                  <Pressable
                    disabled={item.delivery === 'sending'}
                    onPress={() => chat.retry(item)}
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
                      {item.delivery === 'failed' ? 'Failed · tap to retry' : 'Sending…'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <StatePanel
            icon="👋"
            title="Start the crew chat"
            message="Coordinate what to bring or say hello. Keep all plans at the revealed public venue."
          />
        }
      />
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
    marginBottom: tokens.space.sm
  },
  backText: { fontSize: 14, fontWeight: '800' },
  list: { flexGrow: 1, paddingVertical: tokens.space.sm },
  system: {
    alignSelf: 'center',
    maxWidth: '86%',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    marginVertical: tokens.space.sm
  },
  systemText: { fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  messageRow: { maxWidth: '82%', marginVertical: 5 },
  mineRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { marginLeft: 8, marginBottom: 3, fontSize: 11, fontWeight: '900' },
  bubble: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  body: { fontSize: 15, lineHeight: 21 },
  metadata: { flexDirection: 'row', gap: tokens.space.sm, marginTop: 3 },
  time: { fontSize: 10, fontWeight: '700' },
  delivery: { fontSize: 10, fontWeight: '800' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.space.sm
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 12,
    fontSize: 15
  },
  send: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18
  },
  sendText: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' }
});
