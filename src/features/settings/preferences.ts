import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationPreferences = {
  enabled: boolean;
  chatMessages: boolean;
  activityReminders: boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  chatMessages: true,
  activityReminders: true
};

const preferenceKey = 'campus-clash.notification-preferences';
const themeKey = 'campus-clash.theme-preference';
const notificationListeners = new Set<(preferences: NotificationPreferences) => void>();

export async function readNotificationPreferences(): Promise<NotificationPreferences> {
  const value = await AsyncStorage.getItem(preferenceKey);
  if (!value) return defaultNotificationPreferences;
  try {
    const parsed = JSON.parse(value) as Partial<NotificationPreferences>;
    return {
      enabled:
        typeof parsed.enabled === 'boolean'
          ? parsed.enabled
          : defaultNotificationPreferences.enabled,
      chatMessages:
        typeof parsed.chatMessages === 'boolean'
          ? parsed.chatMessages
          : defaultNotificationPreferences.chatMessages,
      activityReminders:
        typeof parsed.activityReminders === 'boolean'
          ? parsed.activityReminders
          : defaultNotificationPreferences.activityReminders
    };
  } catch {
    return defaultNotificationPreferences;
  }
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  await AsyncStorage.setItem(preferenceKey, JSON.stringify(preferences));
  notificationListeners.forEach((listener) => listener(preferences));
}

export function subscribeNotificationPreferences(
  listener: (preferences: NotificationPreferences) => void
): () => void {
  notificationListeners.add(listener);
  return () => notificationListeners.delete(listener);
}

export async function readThemePreference(): Promise<'system' | 'light' | 'dark'> {
  const value = await AsyncStorage.getItem(themeKey);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function saveThemePreference(
  preference: 'system' | 'light' | 'dark'
): Promise<void> {
  await AsyncStorage.setItem(themeKey, preference);
}
