import type { ConfirmationStatus, GroupStatus, MessageKind } from '@/types/database';
import type { ImageSource } from 'expo-image';

export type GroupMemberCard = {
  id: string;
  displayName: string;
  avatarPath: string | null;
  isHost: boolean;
  confirmation: ConfirmationStatus | null;
};

export type GroupLobby = {
  id: string;
  status: GroupStatus;
  confirmationDeadline: string;
  activitySessionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  venue: {
    name: string;
    address: string;
    notes: string | null;
  } | null;
  members: GroupMemberCard[];
};

export type PendingMatch = {
  id: string;
  activitySessionId: string;
  title: string;
  startsAt: string;
  joinedAt: string;
  imageSource: ImageSource | number;
};

export type ChatMessage = {
  id: string;
  groupId: string;
  senderId: string | null;
  kind: MessageKind;
  body: string;
  clientId: string | null;
  createdAt: string;
};

export type OutboxMessage = ChatMessage & {
  delivery: 'sending' | 'failed';
};
