import { useState } from 'react';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { LoadingScreen } from '@/components/ui/loading-screen';
import type { EventMessage } from '@/features/events/event-types';
import { useEventChat, useEventDetail } from '@/features/events/use-events';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

function MessageBubble({
  message,
  onReaction
}: {
  message: EventMessage;
  onReaction: (reaction: '👍' | '❤️' | '😂' | '🎉' | '❗') => void;
}) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const mine = message.senderId === user?.id;
  if (message.kind === 'system') {
    return (
      <Text style={[styles.systemMessage, { color: theme.textMuted }]}>
        {message.body}
      </Text>
    );
  }
  return (
    <View style={[styles.messageWrap, mine ? styles.mine : styles.theirs]}>
      {!mine ? (
        <Text style={[styles.sender, { color: theme.textMuted }]}>
          {message.senderName}
        </Text>
      ) : null}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? theme.primary : theme.surfaceElevated,
            borderColor: mine ? theme.primary : theme.border
          }
        ]}
      >
        <Text style={[styles.body, { color: mine ? theme.onPrimary : theme.text }]}>
          {message.body}
        </Text>
        <Text
          style={[
            styles.time,
            { color: mine ? theme.onPrimary : theme.textSubtle, opacity: 0.78 }
          ]}
        >
          {format(new Date(message.createdAt), 'p')}
          {message.delivery === 'sending' ? ' · Sending' : ''}
          {message.delivery === 'failed' ? ' · Failed' : ''}
        </Text>
      </View>
      {message.reactions.length ? (
        <View style={styles.reactions}>
          {message.reactions.map((entry) => (
            <Pressable
              key={entry.reaction}
              accessibilityRole="button"
              accessibilityLabel={`${entry.reaction}, ${entry.count} reactions`}
              accessibilityState={{ selected: entry.reactedByMe }}
              onPress={() => onReaction(entry.reaction)}
              style={[
                styles.reaction,
                {
                  backgroundColor: entry.reactedByMe
                    ? theme.accentMuted
                    : theme.surfaceElevated,
                  borderColor: entry.reactedByMe ? theme.accent : theme.border
                }
              ]}
            >
              <Text style={[styles.reactionText, { color: theme.text }]}>
                {entry.reaction} {entry.count}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {message.delivery === 'failed' ? (
        <Text style={[styles.retryHint, { color: theme.danger }]}>Tap to retry</Text>
      ) : null}
    </View>
  );
}

export default function EventChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const { theme } = useTheme();
  const { user } = useAuth();
  const network = useNetInfo();
  const event = useEventDetail(eventId ?? '');
  const chat = useEventChat(eventId ?? '');
  const [body, setBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<EventMessage | null>(null);
  const [openedAt] = useState(() => Date.now());

  if (!eventId || event.isError || (!event.isLoading && !event.data?.chatEnabled)) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="lock"
          title="Chat access unavailable"
          message="Only confirmed attendees and authorized hosts can enter this private event chat."
          actionLabel="Back to event"
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }
  if (event.isLoading || !event.data) return <LoadingScreen />;
  const readOnly =
    event.data.status !== 'published' ||
    new Date(event.data.endsAt).getTime() <= openedAt;

  const openMessageActions = (message: EventMessage) => {
    if (message.delivery === 'sending' || message.delivery === 'failed') return;
    const mine = message.senderId === user?.id;
    const canUseBody = !message.removedAt && message.kind !== 'system';
    Alert.alert('Message actions', message.senderName, [
      ...(canUseBody
        ? [
            {
              text: 'React',
              onPress: () =>
                Alert.alert(
                  'React to message',
                  'Choose one of the supported reactions.',
                  [
                    ...(['👍', '❤️', '😂', '🎉', '❗'] as const).map((reaction) => ({
                      text: reaction,
                      onPress: () => chat.react(message, reaction)
                    })),
                    { text: 'Cancel', style: 'cancel' as const }
                  ]
                )
            },
            { text: 'Reply', onPress: () => setReplyingTo(message) },
            {
              text: 'Copy text',
              onPress: () => {
                void Clipboard.setStringAsync(message.body);
              }
            }
          ]
        : []),
      ...(!mine && canUseBody
        ? [
            {
              text: 'Report privately',
              style: 'destructive' as const,
              onPress: () =>
                router.push({
                  pathname: '/report',
                  params: { eventMessageId: message.id, eventId }
                })
            }
          ]
        : []),
      { text: 'Cancel', style: 'cancel' as const }
    ]);
  };

  const composer = readOnly ? (
    <InlineNotice
      tone="info"
      icon="lock"
      message="This event ended. Chat history is read-only."
    />
  ) : (
    <View style={styles.composer}>
      {replyingTo ? (
        <View style={[styles.replyBanner, { borderColor: theme.border }]}>
          <View style={styles.replyCopy}>
            <Text style={[styles.replyLabel, { color: theme.textMuted }]}>
              Replying to {replyingTo.senderName}
            </Text>
            <Text numberOfLines={1} style={[styles.replyBody, { color: theme.text }]}>
              {replyingTo.body}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
            onPress={() => setReplyingTo(null)}
            style={styles.replyClose}
          >
            <AppIcon name="close" color={theme.textMuted} size={18} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.composerRow}>
        <TextInput
          accessibilityLabel="Message"
          placeholder={
            network.isConnected === false ? 'Reconnect to send' : 'Message the event chat'
          }
          placeholderTextColor={theme.textSubtle}
          value={body}
          onChangeText={setBody}
          editable={network.isConnected !== false}
          maxLength={2000}
          multiline
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border
            }
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!body.trim() || network.isConnected === false}
          onPress={() => {
            chat.send(body, undefined, replyingTo?.id);
            setBody('');
            setReplyingTo(null);
          }}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: theme.primary,
              opacity:
                !body.trim() || network.isConnected === false ? 0.4 : pressed ? 0.72 : 1
            }
          ]}
        >
          <AppIcon name="send" color={theme.onPrimary} size={20} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <AppScreen scroll={false} contentStyle={styles.screen} footer={composer}>
      <View style={styles.header}>
        <BackButton />
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
            {event.data.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Private event chat
          </Text>
        </View>
      </View>
      {network.isConnected === false ? (
        <InlineNotice
          tone="offline"
          icon="↯"
          message="Offline — messages will not send."
        />
      ) : null}
      {chat.reactionError ? (
        <InlineNotice
          tone="error"
          icon="!"
          message="The reaction was not changed. Check your connection and try again."
        />
      ) : null}
      {chat.isLoading ? (
        <LoadingScreen />
      ) : chat.isError ? (
        <ErrorState
          icon="↻"
          title="Messages are unavailable"
          message="Reconnect and try again. No message data is stored in analytics."
          actionLabel="Try again"
          onAction={() => void chat.refetch()}
        />
      ) : (
        <FlatList
          data={chat.data}
          inverted
          keyExtractor={(message) => message.id}
          renderItem={({ item }) => (
            <Pressable
              accessibilityHint="Long press for message actions"
              onPress={item.delivery === 'failed' ? () => chat.retry(item) : undefined}
              onLongPress={() => openMessageActions(item)}
            >
              <MessageBubble
                message={item}
                onReaction={(reaction) => chat.react(item, reaction)}
              />
            </Pressable>
          )}
          contentContainerStyle={styles.messages}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              No messages yet. Keep personal information out of chat and report
              harassment.
            </Text>
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: tokens.space.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.md
  },
  headerCopy: { flex: 1 },
  title: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  subtitle: { marginTop: 2, fontSize: tokens.type.caption },
  messages: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingVertical: tokens.space.sm
  },
  messageWrap: { maxWidth: '84%', marginVertical: tokens.space.xs },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: {
    marginBottom: 4,
    marginHorizontal: 4,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.bold
  },
  bubble: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 13,
    paddingVertical: 9
  },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  reaction: {
    minHeight: 32,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 9
  },
  reactionText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.medium },
  body: { fontSize: tokens.type.body, lineHeight: tokens.lineHeight.body },
  time: { marginTop: 3, fontSize: 10, textAlign: 'right' },
  retryHint: {
    marginTop: 2,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.bold
  },
  systemMessage: {
    alignSelf: 'center',
    marginVertical: tokens.space.sm,
    fontSize: tokens.type.caption,
    textAlign: 'center'
  },
  empty: {
    marginTop: tokens.space.xl,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    textAlign: 'center'
  },
  composer: { gap: tokens.space.sm },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: tokens.space.sm },
  replyBanner: {
    minHeight: tokens.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    paddingLeft: tokens.space.sm
  },
  replyCopy: { flex: 1 },
  replyLabel: { fontSize: tokens.type.micro, fontWeight: tokens.weight.bold },
  replyBody: { marginTop: 2, fontSize: tokens.type.caption },
  replyClose: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center'
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 12,
    fontSize: tokens.type.body
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
