import { z } from 'zod';

import type {
  FriendRequestResult,
  SocialConnectionCursor,
  SocialConnectionKind,
  SocialConnectionPage,
  SocialOverview,
  SocialPreferences,
  SocialProfile,
  SocialSuggestionCursor,
  SocialSuggestionPage
} from '@/features/social/social-types';
import { requireSupabase } from '@/lib/supabase';

const uuid = z.string().uuid();
const preferencesSchema = z.object({
  profileVisibility: z.enum(['campus', 'friends', 'private']),
  attendanceVisibility: z.enum(['friends', 'confirmed_attendees', 'private']),
  allowFriendRequests: z.boolean(),
  followPolicy: z.enum(['public', 'approval', 'disabled']),
  showInSuggestions: z.boolean()
});
const overviewSchema = z.object({
  counts: z.object({
    friends: z.number().int().nonnegative(),
    following: z.number().int().nonnegative(),
    followers: z.number().int().nonnegative(),
    incomingFriendRequests: z.number().int().nonnegative(),
    incomingFollowRequests: z.number().int().nonnegative()
  }),
  preferences: preferencesSchema
});
const connectionCursorSchema = z.object({ createdAt: z.string(), profileId: uuid });
const connectionPageSchema = z.object({
  items: z.array(
    z.object({
      profileId: uuid,
      displayName: z.string(),
      username: z.string().nullable(),
      avatarPath: z.string().nullable(),
      relation: z.enum([
        'friend',
        'following',
        'follower',
        'friend_request',
        'follow_request'
      ]),
      requestId: uuid.nullable(),
      connectedAt: z.string()
    })
  ),
  nextCursor: connectionCursorSchema.nullable()
});
const suggestionCursorSchema = z.object({ score: z.number().int(), profileId: uuid });
const suggestionPageSchema = z.object({
  items: z.array(
    z.object({
      profileId: uuid,
      displayName: z.string(),
      username: z.string().nullable(),
      avatarPath: z.string().nullable(),
      mutualFriends: z.number().int().nonnegative(),
      sharedOrganizations: z.number().int().nonnegative(),
      sharedEvents: z.number().int().nonnegative(),
      sharedInterests: z.number().int().nonnegative(),
      explanation: z.string()
    })
  ),
  nextCursor: suggestionCursorSchema.nullable()
});
const profileSchema = z.object({
  id: uuid,
  displayName: z.string(),
  username: z.string().nullable(),
  avatarPath: z.string().nullable(),
  bio: z.string().nullable(),
  campusName: z.string(),
  isFriend: z.boolean(),
  isFollowing: z.boolean(),
  followStatus: z.enum(['pending', 'active']).nullable(),
  followsYou: z.boolean(),
  friendRequestStatus: z.enum(['pending', 'accepted']).nullable(),
  friendRequestDirection: z.enum(['incoming', 'outgoing']).nullable(),
  mutualFriends: z.number().int().nonnegative()
});
const friendRequestResultSchema = z.object({
  id: uuid.optional(),
  status: z.enum(['pending', 'accepted']),
  alreadyPending: z.boolean().optional(),
  alreadyFriends: z.boolean().optional()
});

const demoProfiles = [
  {
    profileId: '10000000-0000-4000-8000-000000000002',
    displayName: 'Jordan',
    username: 'jordan_demo',
    avatarPath: null,
    explanation: '2 mutual friends'
  },
  {
    profileId: '10000000-0000-4000-8000-000000000003',
    displayName: 'Priya',
    username: 'priya_demo',
    avatarPath: null,
    explanation: 'Similar campus interests'
  }
] as const;

export async function fetchSocialOverview(isDemo: boolean): Promise<SocialOverview> {
  if (isDemo) {
    return {
      counts: {
        friends: 4,
        following: 7,
        followers: 5,
        incomingFriendRequests: 1,
        incomingFollowRequests: 1
      },
      preferences: {
        profileVisibility: 'friends',
        attendanceVisibility: 'friends',
        allowFriendRequests: true,
        followPolicy: 'approval',
        showInSuggestions: false
      }
    };
  }
  const { data, error } = await requireSupabase().rpc('get_social_overview');
  if (error) throw error;
  return overviewSchema.parse(data) as SocialOverview;
}

export async function fetchSocialConnections(
  kind: SocialConnectionKind,
  cursor: SocialConnectionCursor | null,
  isDemo: boolean
): Promise<SocialConnectionPage> {
  if (isDemo) {
    const relation =
      kind === 'friends'
        ? 'friend'
        : kind === 'following'
          ? 'following'
          : kind === 'followers'
            ? 'follower'
            : kind === 'friend_requests'
              ? 'friend_request'
              : 'follow_request';
    return {
      items: demoProfiles.slice(0, kind.includes('request') ? 1 : 2).map((profile) => ({
        ...profile,
        relation,
        requestId:
          kind === 'friend_requests' ? '90000000-0000-4000-8000-000000000001' : null,
        connectedAt: new Date().toISOString()
      })),
      nextCursor: null
    };
  }
  const { data, error } = await requireSupabase().rpc('get_social_connections', {
    connection_kind: kind,
    ...(cursor
      ? { before_created_at: cursor.createdAt, before_profile_id: cursor.profileId }
      : {}),
    page_size: 30
  });
  if (error) throw error;
  return connectionPageSchema.parse(data) as SocialConnectionPage;
}

export async function fetchSocialSuggestions(
  cursor: SocialSuggestionCursor | null,
  isDemo: boolean
): Promise<SocialSuggestionPage> {
  if (isDemo) {
    return {
      items: demoProfiles.map((profile, index) => ({
        ...profile,
        mutualFriends: index === 0 ? 2 : 0,
        sharedOrganizations: 0,
        sharedEvents: index,
        sharedInterests: 2 - index
      })),
      nextCursor: null
    };
  }
  const { data, error } = await requireSupabase().rpc('get_social_suggestions', {
    ...(cursor
      ? { cursor_score: cursor.score, cursor_profile_id: cursor.profileId }
      : {}),
    page_size: 20
  });
  if (error) throw error;
  return suggestionPageSchema.parse(data) as SocialSuggestionPage;
}

export async function fetchSocialProfile(
  profileId: string,
  isDemo: boolean
): Promise<SocialProfile> {
  if (isDemo) {
    const match = demoProfiles.find((profile) => profile.profileId === profileId);
    return {
      id: profileId,
      displayName: match?.displayName ?? 'Ruckus member',
      username: match?.username ?? null,
      avatarPath: null,
      bio: 'A demo campus profile. Connected mode always applies the member’s privacy choices.',
      campusName: 'Demo University',
      isFriend: false,
      isFollowing: false,
      followStatus: null,
      followsYou: false,
      friendRequestStatus: null,
      friendRequestDirection: null,
      mutualFriends: match?.profileId === demoProfiles[0].profileId ? 2 : 0
    };
  }
  const { data, error } = await requireSupabase().rpc('get_social_profile', {
    target_profile_id: profileId
  });
  if (error) throw error;
  return profileSchema.parse(data) as SocialProfile;
}

export async function updateSocialPreferences(
  preferences: SocialPreferences,
  isDemo: boolean
): Promise<SocialPreferences> {
  if (isDemo) return preferences;
  const { data, error } = await requireSupabase().rpc('set_social_preferences', {
    new_profile_visibility: preferences.profileVisibility,
    new_attendance_visibility: preferences.attendanceVisibility,
    new_allow_friend_requests: preferences.allowFriendRequests,
    new_follow_policy: preferences.followPolicy,
    new_show_in_social_suggestions: preferences.showInSuggestions
  });
  if (error) throw error;
  return preferencesSchema.parse(data) as SocialPreferences;
}

export async function followProfile(profileId: string, isDemo: boolean) {
  if (isDemo) return 'active' as const;
  const { data, error } = await requireSupabase().rpc('follow_user', {
    target_profile_id: profileId
  });
  if (error) throw error;
  return z.enum(['pending', 'active']).parse(data);
}

export async function unfollowProfile(profileId: string, isDemo: boolean) {
  if (isDemo) return true;
  const { data, error } = await requireSupabase().rpc('unfollow_user', {
    target_profile_id: profileId
  });
  if (error) throw error;
  return data;
}

export async function sendFriendRequest(
  profileId: string,
  isDemo: boolean
): Promise<FriendRequestResult> {
  if (isDemo) return { status: 'pending', alreadyPending: false };
  const { data, error } = await requireSupabase().rpc('send_friend_request', {
    target_profile_id: profileId
  });
  if (error) throw error;
  return friendRequestResultSchema.parse(data) as FriendRequestResult;
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean,
  isDemo: boolean
) {
  if (isDemo) return accept ? 'accepted' : 'declined';
  const { data, error } = await requireSupabase().rpc('respond_to_friend_request', {
    request_id: requestId,
    accept_request: accept
  });
  if (error) throw error;
  return data;
}

export async function respondToFollowRequest(
  profileId: string,
  accept: boolean,
  isDemo: boolean
) {
  if (isDemo) return accept ? 'active' : 'declined';
  const { data, error } = await requireSupabase().rpc('respond_to_follow_request', {
    requester_profile_id: profileId,
    accept_request: accept
  });
  if (error) throw error;
  return data;
}

export async function removeFriend(profileId: string, isDemo: boolean) {
  if (isDemo) return true;
  const { data, error } = await requireSupabase().rpc('remove_friend', {
    target_profile_id: profileId
  });
  if (error) throw error;
  return data;
}
