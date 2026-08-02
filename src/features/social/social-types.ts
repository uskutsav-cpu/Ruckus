export type ProfileVisibility = 'campus' | 'friends' | 'private';
export type AttendanceVisibility = 'friends' | 'confirmed_attendees' | 'private';
export type FollowPolicy = 'public' | 'approval' | 'disabled';

export type SocialPreferences = {
  profileVisibility: ProfileVisibility;
  attendanceVisibility: AttendanceVisibility;
  allowFriendRequests: boolean;
  followPolicy: FollowPolicy;
  showInSuggestions: boolean;
};

export type SocialOverview = {
  counts: {
    friends: number;
    following: number;
    followers: number;
    incomingFriendRequests: number;
    incomingFollowRequests: number;
  };
  preferences: SocialPreferences;
};

export type SocialConnectionKind =
  'friends' | 'following' | 'followers' | 'friend_requests' | 'follow_requests';

export type SocialConnection = {
  profileId: string;
  displayName: string;
  username: string | null;
  avatarPath: string | null;
  relation: 'friend' | 'following' | 'follower' | 'friend_request' | 'follow_request';
  requestId: string | null;
  connectedAt: string;
};

export type SocialConnectionCursor = {
  createdAt: string;
  profileId: string;
};

export type SocialConnectionPage = {
  items: SocialConnection[];
  nextCursor: SocialConnectionCursor | null;
};

export type SocialSuggestion = {
  profileId: string;
  displayName: string;
  username: string | null;
  avatarPath: string | null;
  mutualFriends: number;
  sharedOrganizations: number;
  sharedEvents: number;
  sharedInterests: number;
  explanation: string;
};

export type SocialSuggestionCursor = {
  score: number;
  profileId: string;
};

export type SocialSuggestionPage = {
  items: SocialSuggestion[];
  nextCursor: SocialSuggestionCursor | null;
};

export type SocialProfile = {
  id: string;
  displayName: string;
  username: string | null;
  avatarPath: string | null;
  bio: string | null;
  campusName: string;
  isFriend: boolean;
  isFollowing: boolean;
  followStatus: 'pending' | 'active' | null;
  followsYou: boolean;
  friendRequestStatus: 'pending' | 'accepted' | null;
  friendRequestDirection: 'incoming' | 'outgoing' | null;
  mutualFriends: number;
};

export type FriendRequestResult = {
  id?: string;
  status: 'pending' | 'accepted';
  alreadyPending?: boolean;
  alreadyFriends?: boolean;
};
