import { useEffect, useRef, useState } from 'react';
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { safeNotificationRoute } from '@/features/notifications/notification-route';
import {
  registerForPush,
  syncNotificationPreferences,
  unregisterCurrentPushDevice
} from '@/features/notifications/notification-service';
import {
  defaultNotificationPreferences,
  readNotificationPreferences,
  subscribeNotificationPreferences,
  type NotificationPreferences
} from '@/features/settings/preferences';
import { logger } from '@/lib/logger';
import { useAuth } from '@/providers/auth-provider';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });
}

function openNotification(response: Notifications.NotificationResponse): void {
  const route = safeNotificationRoute(response.notification.request.content.data?.url);
  if (route) router.push(route as Href);
}

export function NotificationBootstrap() {
  const { isDemo, profile, user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences
  );
  const lastResponseId = useRef<string | null>(null);

  useEffect(() => {
    void readNotificationPreferences().then(setPreferences);
    return subscribeNotificationPreferences(setPreferences);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !user || isDemo || !profile?.onboarding_completed_at) {
      return;
    }
    let active = true;
    void syncNotificationPreferences(preferences)
      .then(() =>
        preferences.enabled ? registerForPush() : unregisterCurrentPushDevice()
      )
      .catch((error: unknown) => {
        if (active) {
          logger.warn('push.registration_failed', {
            message: error instanceof Error ? error.message : 'unknown'
          });
        }
      });
    return () => {
      active = false;
    };
  }, [isDemo, preferences, profile?.onboarding_completed_at, user]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        lastResponseId.current = response.notification.request.identifier;
        openNotification(response);
      }
    );
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (
        response &&
        response.notification.request.identifier !== lastResponseId.current
      ) {
        lastResponseId.current = response.notification.request.identifier;
        setTimeout(() => openNotification(response), 300);
      }
    });
    return () => subscription.remove();
  }, []);

  return null;
}
