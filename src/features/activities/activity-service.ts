import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import {
  demoActivities,
  localActivityImage
} from '@/features/activities/demo-activities';
import type {
  Activity,
  MatchState,
  SwipeDirection
} from '@/features/activities/activity-types';
import { logger } from '@/lib/logger';
import { requireSupabase } from '@/lib/supabase';
import type { ActivityFeedRow, Json } from '@/types/database';

type StoredDecision = {
  sessionId: string;
  direction: SwipeDirection;
  createdAt: string;
};

const decisionsKey = (userId: string) => `campus-clash.deck-decisions.${userId}`;
const queueKey = (userId: string) => `campus-clash.swipe-queue.${userId}`;

function isRecord(value: Json): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toMatchState(value: Json): MatchState {
  if (!isRecord(value)) return { state: 'waiting' };
  const state =
    value.state === 'matched' || value.state === 'passed' ? value.state : 'waiting';
  return {
    state,
    ...(typeof value.groupId === 'string' ? { groupId: value.groupId } : {}),
    ...(typeof value.memberCount === 'number' ? { memberCount: value.memberCount } : {}),
    ...(typeof value.confirmationDeadline === 'string'
      ? { confirmationDeadline: value.confirmationDeadline }
      : {})
  };
}

async function readDecisions(userId: string): Promise<StoredDecision[]> {
  const value = await AsyncStorage.getItem(decisionsKey(userId));
  if (!value) return [];
  try {
    return JSON.parse(value) as StoredDecision[];
  } catch {
    return [];
  }
}

export async function storeLocalDecision(
  userId: string,
  sessionId: string,
  direction: SwipeDirection
): Promise<void> {
  const decisions = await readDecisions(userId);
  if (decisions.some((entry) => entry.sessionId === sessionId)) return;
  await AsyncStorage.setItem(
    decisionsKey(userId),
    JSON.stringify([
      ...decisions,
      { sessionId, direction, createdAt: new Date().toISOString() }
    ] satisfies StoredDecision[])
  );
}

export async function removeLocalDecision(
  userId: string,
  sessionId: string
): Promise<void> {
  const decisions = await readDecisions(userId);
  await AsyncStorage.setItem(
    decisionsKey(userId),
    JSON.stringify(decisions.filter((entry) => entry.sessionId !== sessionId))
  );
}

async function enqueueDecision(
  userId: string,
  sessionId: string,
  direction: SwipeDirection
): Promise<void> {
  const value = await AsyncStorage.getItem(queueKey(userId));
  const queue = value ? (JSON.parse(value) as StoredDecision[]) : [];
  if (queue.some((entry) => entry.sessionId === sessionId)) return;
  await AsyncStorage.setItem(
    queueKey(userId),
    JSON.stringify([
      ...queue,
      { sessionId, direction, createdAt: new Date().toISOString() }
    ])
  );
}

async function sendDecision(
  sessionId: string,
  direction: SwipeDirection
): Promise<MatchState> {
  const supabase = requireSupabase();
  if (direction === 'left') {
    const { data, error } = await supabase.rpc('record_activity_pass', {
      target_session_id: sessionId
    });
    if (error) throw error;
    return toMatchState(data);
  }

  const { data, error } = await supabase.functions.invoke('match-activity-session', {
    body: { activitySessionId: sessionId }
  });
  if (error) throw error;
  return toMatchState(data as Json);
}

function isNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return ['fetch', 'network', 'connection', 'offline', 'timed out'].some((term) =>
    message.includes(term)
  );
}

export async function flushSwipeQueue(userId: string): Promise<void> {
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) return;

  const value = await AsyncStorage.getItem(queueKey(userId));
  if (!value) return;
  const queue = JSON.parse(value) as StoredDecision[];
  const remaining: StoredDecision[] = [];

  for (const entry of queue) {
    try {
      await sendDecision(entry.sessionId, entry.direction);
    } catch (error) {
      remaining.push(entry);
      logger.warn('swipe.queue_retry_failed', {
        sessionId: entry.sessionId,
        message: error instanceof Error ? error.message : 'unknown'
      });
    }
  }
  await AsyncStorage.setItem(queueKey(userId), JSON.stringify(remaining));
}

export async function submitSwipe(
  userId: string,
  sessionId: string,
  direction: SwipeDirection,
  isDemo: boolean
): Promise<MatchState> {
  if (isDemo) {
    return direction === 'right' ? { state: 'waiting' } : { state: 'passed' };
  }

  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) {
    await enqueueDecision(userId, sessionId, direction);
    return { state: direction === 'left' ? 'passed' : 'waiting' };
  }
  try {
    return await sendDecision(sessionId, direction);
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    await enqueueDecision(userId, sessionId, direction);
    return { state: direction === 'left' ? 'passed' : 'waiting' };
  }
}

function validFeedRow(row: ActivityFeedRow): row is ActivityFeedRow & {
  id: string;
  activity_template_id: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  swipe_closes_at: string;
  capacity: number;
  gradient_start: string;
  gradient_end: string;
} {
  return Boolean(
    row.id &&
    row.activity_template_id &&
    row.title &&
    row.description &&
    row.category &&
    row.duration_minutes &&
    row.starts_at &&
    row.ends_at &&
    row.swipe_closes_at &&
    row.capacity &&
    row.gradient_start &&
    row.gradient_end
  );
}

export async function fetchActivities(
  userId: string,
  isDemo: boolean
): Promise<Activity[]> {
  const localDecisions = await readDecisions(userId);
  const excluded = new Set(localDecisions.map((entry) => entry.sessionId));

  if (isDemo) {
    return demoActivities.filter((activity) => !excluded.has(activity.id));
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*')
    .order('starts_at');
  if (error) throw error;

  const rows = (data ?? []).filter(validFeedRow);
  const paths = rows
    .map((row) => row.image_path)
    .filter((path): path is string => Boolean(path));
  const signedUrls = new Map<string, string>();

  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from('activity-images')
      .createSignedUrls(paths, 60 * 60);
    signed?.forEach((item) => {
      if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
    });
  }

  return rows
    .filter((row) => !excluded.has(row.id))
    .map((row) => {
      const signedUrl = row.image_path ? signedUrls.get(row.image_path) : undefined;
      return {
        id: row.id,
        templateId: row.activity_template_id,
        title: row.title,
        description: row.description,
        category: row.category,
        durationMinutes: row.duration_minutes,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        swipeClosesAt: row.swipe_closes_at,
        capacity: row.capacity,
        gradientStart: row.gradient_start,
        gradientEnd: row.gradient_end,
        imagePath: row.image_path,
        imageSource: signedUrl
          ? { uri: signedUrl }
          : localActivityImage(row.activity_template_id)
      };
    });
}
