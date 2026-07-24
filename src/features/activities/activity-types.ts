import type { ImageSource } from 'expo-image';

export type Activity = {
  id: string;
  templateId: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  swipeClosesAt: string;
  capacity: number;
  gradientStart: string;
  gradientEnd: string;
  imagePath: string | null;
  imageSource: ImageSource | number;
  campusArea?: string;
  interestedCount?: number;
};

export type SwipeDirection = 'left' | 'right';

export type MatchState = {
  state: 'passed' | 'waiting' | 'matched';
  groupId?: string;
  memberCount?: number;
  confirmationDeadline?: string;
};
