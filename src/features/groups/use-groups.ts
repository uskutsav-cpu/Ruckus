import { useEffect, useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';

import {
  confirmAttendance,
  fetchGroupLobby,
  fetchGroups,
  fetchMessagePage,
  fetchPendingMatches,
  finalizeGroup,
  hasNextMessagePage,
  leaveGroup,
  sendMessage
} from '@/features/groups/group-service';
import type { ChatMessage, OutboxMessage } from '@/features/groups/group-types';
import { requireSupabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export function useGroups() {
  const { isDemo, user } = useAuth();
  return useQuery({
    queryKey: ['groups', user?.id, isDemo],
    queryFn: () => fetchGroups(isDemo),
    enabled: Boolean(user)
  });
}

export function usePendingMatches() {
  const { isDemo, user } = useAuth();
  return useQuery({
    queryKey: ['pending-matches', user?.id, isDemo],
    queryFn: () => fetchPendingMatches(isDemo),
    enabled: Boolean(user)
  });
}

export function useGroupLobby(groupId: string) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['group-lobby', groupId, isDemo],
    queryFn: () => fetchGroupLobby(groupId, isDemo),
    enabled: Boolean(groupId),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending_confirmation' ? 15_000 : false
  });
}

export function useConfirmAttendance(groupId: string) {
  const { isDemo, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => confirmAttendance(groupId, isDemo),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['group-lobby', groupId, isDemo]
        }),
        queryClient.invalidateQueries({ queryKey: ['groups', user?.id, isDemo] })
      ]);
    }
  });
}

export function useLeaveGroup(groupId: string) {
  const { isDemo, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveGroup(groupId, isDemo),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups', user?.id, isDemo] }),
        queryClient.invalidateQueries({
          queryKey: ['group-lobby', groupId, isDemo]
        })
      ]);
    }
  });
}

export function useFinalizeGroup(groupId: string) {
  const { isDemo, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => finalizeGroup(groupId, isDemo),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['group-lobby', groupId, isDemo]
        }),
        queryClient.invalidateQueries({ queryKey: ['groups', user?.id, isDemo] }),
        queryClient.invalidateQueries({ queryKey: ['profile-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      ]);
    }
  });
}

type SendInput = { clientId: string; body: string };

export function useChat(groupId: string) {
  const { isDemo, user } = useAuth();
  const queryClient = useQueryClient();
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);
  const queryKey = useMemo(
    () => ['messages', groupId, isDemo] as const,
    [groupId, isDemo]
  );
  const messages = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchMessagePage(groupId, pageParam, isDemo),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      hasNextMessagePage(lastPage) ? lastPageParam + 1 : undefined,
    enabled: Boolean(groupId && user)
  });

  useEffect(() => {
    if (isDemo || !groupId) return;
    const supabase = requireSupabase();
    const channel = supabase
      .channel(`group:${groupId}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, isDemo, queryClient, queryKey]);

  const mutation = useMutation({
    mutationFn: (input: SendInput) => {
      if (!user) throw new Error('Sign in to send messages.');
      return sendMessage(
        {
          groupId,
          senderId: user.id,
          clientId: input.clientId,
          body: input.body
        },
        isDemo
      );
    },
    onSuccess: async (saved) => {
      setOutbox((current) =>
        current.filter((message) => message.clientId !== saved.clientId)
      );
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (_error, input) => {
      setOutbox((current) =>
        current.map((message) =>
          message.clientId === input.clientId
            ? { ...message, delivery: 'failed' }
            : message
        )
      );
    }
  });

  const send = (body: string, existingClientId?: string) => {
    if (!user || !body.trim()) return;
    const clientId = existingClientId ?? Crypto.randomUUID();
    setOutbox((current) => [
      ...current.filter((message) => message.clientId !== clientId),
      {
        id: clientId,
        groupId,
        senderId: user.id,
        kind: 'text',
        body: body.trim(),
        clientId,
        createdAt: new Date().toISOString(),
        delivery: 'sending'
      }
    ]);
    mutation.mutate({ clientId, body: body.trim() });
  };

  const retry = (message: OutboxMessage) => send(message.body, message.clientId ?? '');
  const pages = messages.data?.pages.flat() ?? [];
  const byClientId = new Set(outbox.map((message) => message.clientId));
  const deduplicated = pages.filter(
    (message) => !message.clientId || !byClientId.has(message.clientId)
  );

  return {
    ...messages,
    data: [...outbox, ...deduplicated].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    ) as (ChatMessage | OutboxMessage)[],
    send,
    retry,
    sendError: mutation.error,
    isSending: mutation.isPending
  };
}
