import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import type { NotificationPreferences } from '@/features/settings/preferences';
import { logger } from '@/lib/logger';
import { secureStorage } from '@/lib/secure-storage';
import { supabase } from '@/lib/supabase';

const deviceIdKey = 'campus-clash.push-device-id';

async function getDeviceId(): Promise<string> {
  const stored = await secureStorage.getItem(deviceIdKey);
  if (stored) return stored;
  const created = Crypto.randomUUID();
  await secureStorage.setItem(deviceIdKey, created);
  return created;
}

export async function syncNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  const { error } = await supabase.rpc('set_notification_preferences', {
    enabled_value: preferences.enabled,
    chat_messages_value: preferences.chatMessages,
    activity_reminders_value: preferences.activityReminders
  });
  if (error) throw error;
}

export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('activity-updates', {
      name: 'Activity updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 90, 180],
      lightColor: '#7C3AED'
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted' && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== 'granted') return;

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
  if (!projectId) {
    logger.warn('push.project_id_missing');
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_push_token', {
    token_value: token.data,
    platform_value: Platform.OS === 'ios' ? 'ios' : 'android',
    device_value: await getDeviceId()
  });
  if (error) throw error;
}

export async function unregisterCurrentPushDevice(): Promise<void> {
  const deviceId = await secureStorage.getItem(deviceIdKey);
  if (!deviceId) return;
  const { error } = await supabase.from('push_tokens').delete().eq('device_id', deviceId);
  if (error) throw error;
}
