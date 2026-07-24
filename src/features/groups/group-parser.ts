import type { GroupLobby } from '@/features/groups/group-types';
import type { Json } from '@/types/database.generated';

function isObject(value: Json | undefined): value is {
  [key: string]: Json | undefined;
} {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: { [key: string]: Json | undefined }, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw new Error(`Invalid lobby field: ${key}`);
  return value;
}

export function parseLobby(value: Json): GroupLobby {
  if (!isObject(value) || !Array.isArray(value.members)) {
    throw new Error('The group lobby response was invalid.');
  }
  const venue = value.venue;
  return {
    id: readString(value, 'id'),
    status: readString(value, 'status') as GroupLobby['status'],
    confirmationDeadline: readString(value, 'confirmationDeadline'),
    activitySessionId: readString(value, 'activitySessionId'),
    title: readString(value, 'title'),
    startsAt: readString(value, 'startsAt'),
    endsAt: readString(value, 'endsAt'),
    venue: isObject(venue)
      ? {
          name: readString(venue, 'name'),
          address: readString(venue, 'address'),
          notes: typeof venue.notes === 'string' ? venue.notes : null
        }
      : null,
    members: value.members.flatMap((member) => {
      if (!isObject(member)) return [];
      const id = member.id;
      const displayName = member.displayName;
      if (typeof id !== 'string' || typeof displayName !== 'string') return [];
      return [
        {
          id,
          displayName,
          avatarPath: typeof member.avatarPath === 'string' ? member.avatarPath : null,
          isHost: member.isHost === true,
          confirmation:
            member.confirmation === 'pending' ||
            member.confirmation === 'confirmed' ||
            member.confirmation === 'declined' ||
            member.confirmation === 'expired'
              ? member.confirmation
              : null
        }
      ];
    })
  };
}
