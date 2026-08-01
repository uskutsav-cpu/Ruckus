import { useEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  cancelEventRsvp,
  archiveHostedEvent,
  cancelHostedEvent,
  createEvent,
  createEventAnnouncement,
  duplicateHostedEvent,
  fetchEventAttendees,
  fetchEventDetail,
  fetchEventFeed,
  fetchEventMessages,
  fetchMyEvents,
  joinEvent,
  reviewEventRsvp,
  sendEventMessage,
  setEventMessageReaction,
  setEventDecision
} from '@/features/events/event-service';
import type {
  CreateEventInput,
  EventFeedCursor,
  EventFilters,
  EventMessage
} from '@/features/events/event-types';
import { requireSupabase } from '@/lib/supabase';
import { analytics } from '@/lib/analytics';
import { useAuth } from '@/providers/auth-provider';

export function useEventFeed(filters: EventFilters) {
  const { isDemo, user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['event-feed', user?.id, isDemo, filters],
    queryFn: ({ pageParam }) => fetchEventFeed(isDemo, filters, pageParam),
    initialPageParam: null as EventFeedCursor | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(user)
  });
}

export function useEventDetail(eventId: string) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['event-detail', eventId, isDemo],
    queryFn: () => fetchEventDetail(eventId, isDemo),
    enabled: Boolean(eventId)
  });
}

function useInvalidateEvents(eventId?: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['event-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['my-events'] }),
      queryClient.invalidateQueries({ queryKey: ['event-chats'] }),
      ...(eventId
        ? [queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] })]
        : [])
    ]);
  };
}

export function useJoinEvent(eventId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateEvents(eventId);
  return useMutation({
    mutationFn: () => {
      analytics.track('join_attempted');
      return joinEvent(eventId, isDemo);
    },
    onSuccess: async (result) => {
      if (result.status === 'waitlisted') analytics.track('rsvp_waitlisted');
      if (result.status === 'confirmed') analytics.track('rsvp_confirmed');
      await invalidate();
    }
  });
}

export function useCancelEventRsvp(eventId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateEvents(eventId);
  return useMutation({
    mutationFn: () => cancelEventRsvp(eventId, isDemo),
    onSuccess: async () => {
      analytics.track('rsvp_cancelled');
      await invalidate();
    }
  });
}

export function useEventDecision() {
  const { isDemo, user } = useAuth();
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (input: { eventId: string; decision: 'passed' | 'saved' }) => {
      if (!user) throw new Error('AUTHENTICATION_REQUIRED');
      return setEventDecision(user.id, input.eventId, input.decision, isDemo);
    },
    onSuccess: async (_result, input) => {
      if (input.decision === 'passed') analytics.track('event_passed');
      await invalidate();
    }
  });
}

export function useMyEvents() {
  const { isDemo, user } = useAuth();
  return useQuery({
    queryKey: ['my-events', user?.id, isDemo],
    queryFn: () => fetchMyEvents(user!.id, isDemo),
    enabled: Boolean(user)
  });
}

export function useEventChats() {
  const events = useMyEvents();
  return {
    ...events,
    data: events.data?.filter(
      ({ event, relationship }) =>
        (relationship === 'confirmed' || relationship === 'hosting') &&
        event.status !== 'cancelled'
    )
  };
}

export function useEventChat(eventId: string) {
  const { isDemo, user } = useAuth();
  const queryClient = useQueryClient();
  const [outbox, setOutbox] = useState<EventMessage[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queryKey = useMemo(() => ['event-messages', eventId, isDemo], [eventId, isDemo]);
  const messages = useQuery({
    queryKey,
    queryFn: () => fetchEventMessages(eventId, isDemo),
    enabled: Boolean(eventId && user),
    refetchInterval: isDemo ? false : 15_000
  });
  useEffect(() => {
    if (isDemo || !eventId || !user) return;
    const supabase = requireSupabase();
    const channel = supabase
      .channel(`event:${eventId}`, {
        config: { private: true, broadcast: { self: false } }
      })
      .on('broadcast', { event: 'message' }, () => {
        void queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [eventId, isDemo, queryClient, queryKey, user]);
  const mutation = useMutation({
    mutationFn: (input: {
      body: string;
      clientId: string;
      replyToId?: string | null;
    }) => {
      if (!user) throw new Error('AUTHENTICATION_REQUIRED');
      return sendEventMessage({
        eventId,
        senderId: user.id,
        body: input.body,
        clientId: input.clientId,
        ...(input.replyToId !== undefined ? { replyToId: input.replyToId } : {}),
        isDemo
      });
    },
    onSuccess: async (saved) => {
      analytics.track('message_sent', {
        kind: saved.kind,
        reply: Boolean(saved.replyToId)
      });
      if (isDemo) {
        setOutbox((current) =>
          current.map((message) =>
            message.clientId === saved.clientId ? saved : message
          )
        );
        return;
      }
      setOutbox((current) =>
        current.filter((message) => message.clientId !== saved.clientId)
      );
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'message',
        payload: { eventId }
      });
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (_error, input) => {
      setOutbox((current) =>
        current.map((message) =>
          message.clientId === input.clientId
            ? { ...message, delivery: 'failed' as const }
            : message
        )
      );
    }
  });
  const reactionMutation = useMutation({
    mutationFn: (input: {
      messageId: string;
      reaction: '👍' | '❤️' | '😂' | '🎉' | '❗';
      enabled: boolean;
    }) => setEventMessageReaction({ ...input, isDemo }),
    onSuccess: async () => {
      if (!isDemo) {
        void channelRef.current?.send({
          type: 'broadcast',
          event: 'message',
          payload: { eventId, kind: 'reaction' }
        });
      }
      await queryClient.invalidateQueries({ queryKey });
    }
  });
  const send = (body: string, retryClientId?: string, replyToId?: string | null) => {
    if (!user || !body.trim()) return;
    const clientId = retryClientId ?? Crypto.randomUUID();
    setOutbox((current) => [
      {
        id: clientId,
        eventId,
        senderId: user.id,
        senderName: 'You',
        senderAvatarPath: null,
        kind: 'text',
        body: body.trim(),
        replyToId: replyToId ?? null,
        clientId,
        removedAt: null,
        createdAt: new Date().toISOString(),
        reactions: [],
        delivery: 'sending'
      },
      ...current.filter((message) => message.clientId !== clientId)
    ]);
    mutation.mutate({ body: body.trim(), clientId, replyToId: replyToId ?? null });
  };
  return {
    ...messages,
    data: [...outbox, ...(messages.data ?? [])].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    ),
    send,
    retry: (message: EventMessage) =>
      send(message.body, message.clientId ?? message.id, message.replyToId),
    react: (message: EventMessage, reaction: '👍' | '❤️' | '😂' | '🎉' | '❗') =>
      reactionMutation.mutate({
        messageId: message.id,
        reaction,
        enabled: !message.reactions.some(
          (entry) => entry.reaction === reaction && entry.reactedByMe
        )
      }),
    isSending: mutation.isPending,
    sendError: mutation.error,
    reactionError: reactionMutation.error
  };
}

export function useCreateEvent() {
  const { isDemo, profile, user } = useAuth();
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (input: CreateEventInput) => {
      if (!user || !profile) throw new Error('AUTHENTICATION_REQUIRED');
      return createEvent(input, { id: user.id, campusId: profile.campus_id }, isDemo);
    },
    onSuccess: async (_eventId, input) => {
      analytics.track('event_created');
      if (input.publish !== false) analytics.track('event_published');
      await invalidate();
    }
  });
}

export function useDuplicateHostedEvent(eventId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: () => duplicateHostedEvent(eventId, isDemo),
    onSuccess: invalidate
  });
}

export function useEventAttendees(eventId: string) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['event-attendees', eventId, isDemo],
    queryFn: () => fetchEventAttendees(eventId, isDemo),
    enabled: Boolean(eventId)
  });
}

export function useReviewEventRsvp(eventId: string) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rsvpId: string; approve: boolean }) =>
      reviewEventRsvp(input.rsvpId, input.approve, isDemo),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] })
      ]);
    }
  });
}

export function useCreateEventAnnouncement(eventId: string) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; body: string }) =>
      createEventAnnouncement(eventId, input.title, input.body, isDemo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event-messages', eventId] });
    }
  });
}

export function useCancelHostedEvent(eventId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateEvents(eventId);
  return useMutation({
    mutationFn: (reason: string) => cancelHostedEvent(eventId, reason, isDemo),
    onSuccess: invalidate
  });
}

export function useArchiveHostedEvent(eventId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateEvents(eventId);
  return useMutation({
    mutationFn: () => archiveHostedEvent(eventId, isDemo),
    onSuccess: invalidate
  });
}
