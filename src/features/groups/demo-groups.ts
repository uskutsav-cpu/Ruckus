import type {
  ChatMessage,
  GroupLobby,
  PendingMatch
} from '@/features/groups/group-types';

const tacoImage = require('../../../assets/activities/taco-taste-off.png') as number;
const demoUserId = '10000000-0000-4000-8000-000000000001';
const demoGroupId = '50000000-0000-4000-8000-000000000001';
const startsAt = new Date(Date.now() + 26 * 60 * 60_000);
startsAt.setMinutes(0, 0, 0);

let demoConfirmed = false;
let demoLeft = false;
const demoMessages: ChatMessage[] = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    groupId: demoGroupId,
    senderId: null,
    kind: 'system',
    body: 'Crew assembled! Confirm attendance to unlock the public meeting spot.',
    clientId: null,
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString()
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    groupId: demoGroupId,
    senderId: '10000000-0000-4000-8000-000000000002',
    kind: 'text',
    body: 'I can bring an extra water bottle if anyone needs one!',
    clientId: '70000000-0000-4000-8000-000000000002',
    createdAt: new Date(Date.now() - 7 * 60_000).toISOString()
  }
];

export function getDemoLobby(): GroupLobby | null {
  if (demoLeft) return null;
  return {
    id: demoGroupId,
    status: demoConfirmed ? 'confirmed' : 'pending_confirmation',
    confirmationDeadline: new Date(Date.now() + 45 * 60_000).toISOString(),
    activitySessionId: '40000000-0000-4000-8000-000000000001',
    title: 'Sunset Trail Dash',
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 90 * 60_000).toISOString(),
    venue: demoConfirmed
      ? {
          name: 'Riverside Student Pavilion',
          address: '210 Campus Loop',
          notes: 'Meet by the staffed information desk.'
        }
      : null,
    members: [
      {
        id: demoUserId,
        displayName: 'Maya',
        avatarPath: null,
        isHost: false,
        confirmation: demoConfirmed ? 'confirmed' : 'pending'
      },
      {
        id: '10000000-0000-4000-8000-000000000002',
        displayName: 'Jordan',
        avatarPath: null,
        isHost: true,
        confirmation: 'confirmed'
      },
      {
        id: '10000000-0000-4000-8000-000000000003',
        displayName: 'Priya',
        avatarPath: null,
        isHost: false,
        confirmation: 'pending'
      },
      {
        id: '10000000-0000-4000-8000-000000000004',
        displayName: 'Leo',
        avatarPath: null,
        isHost: false,
        confirmation: 'confirmed'
      }
    ]
  };
}

export function getDemoPendingMatches(): PendingMatch[] {
  return [
    {
      id: '80000000-0000-4000-8000-000000000001',
      activitySessionId: '40000000-0000-4000-8000-000000000002',
      title: 'Taco Taste-Off',
      startsAt: new Date(startsAt.getTime() + 24 * 60 * 60_000).toISOString(),
      joinedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      imageSource: tacoImage
    }
  ];
}

export function confirmDemoAttendance(): void {
  demoConfirmed = true;
}

export function leaveDemoGroup(): void {
  demoLeft = true;
}

export function getDemoMessages(offset: number, limit: number): ChatMessage[] {
  return [...demoMessages]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(offset, offset + limit);
}

export function sendDemoMessage(message: ChatMessage): ChatMessage {
  const existing = demoMessages.find(
    (candidate) => candidate.clientId === message.clientId
  );
  if (existing) return existing;
  demoMessages.push(message);
  return message;
}
