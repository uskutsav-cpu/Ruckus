import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import {
  defaultNotificationPreferences,
  readNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences
} from '@/features/settings/preferences';
import { requestAccountDeletion } from '@/features/safety/safety-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const themes = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
] as const;

export default function SettingsScreen() {
  const { isDemo, signOut } = useAuth();
  const { preference, setPreference, theme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    defaultNotificationPreferences
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void readNotificationPreferences().then(setNotifications);
  }, []);

  const updateNotifications = (next: NotificationPreferences) => {
    setNotifications(next);
    void saveNotificationPreferences(next);
  };

  const confirmDeletion = () => {
    Alert.alert(
      'Request account deletion?',
      'You’ll be signed out immediately, removed from waitlists and active groups, and your push tokens will be disabled. After 7 days, the scheduled purge deletes your Auth account and profile-owned data. Contact campus support during that window only if this was a mistake.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Request deletion',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            void requestAccountDeletion(isDemo)
              .then(signOut)
              .catch(() => {
                setDeleting(false);
                Alert.alert(
                  'Deletion request failed',
                  'Your account was not changed. Check your connection and try again.'
                );
              });
          }
        }
      ]
    );
  };

  return (
    <AppScreen
      eyebrow="Preferences"
      title="Settings & safety"
      subtitle="Control appearance and notification categories, review meetup rules, or manage your account."
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={[styles.back, { backgroundColor: theme.surfaceMuted }]}
      >
        <Text style={[styles.backText, { color: theme.text }]}>← Profile</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
      <View style={styles.themeRow}>
        {themes.map((option) => {
          const active = preference === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setPreference(option.value)}
              style={[
                styles.themeChoice,
                {
                  backgroundColor: active ? theme.primary : theme.surfaceMuted,
                  borderColor: active ? theme.primary : theme.border
                }
              ]}
            >
              <Text
                style={[styles.themeText, { color: active ? '#FFFFFF' : theme.text }]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
      <SettingSwitch
        title="Push notifications"
        description="Group formation, confirmation deadlines, check-in, messages, and event timing."
        value={notifications.enabled}
        onChange={(enabled) => updateNotifications({ ...notifications, enabled })}
      />
      <SettingSwitch
        title="Group chat messages"
        description="Notify when another crew member posts."
        value={notifications.enabled && notifications.chatMessages}
        disabled={!notifications.enabled}
        onChange={(chatMessages) =>
          updateNotifications({ ...notifications, chatMessages })
        }
      />
      <SettingSwitch
        title="Activity reminders"
        description="Confirmation deadline, check-in availability, and event start."
        value={notifications.enabled && notifications.activityReminders}
        disabled={!notifications.enabled}
        onChange={(activityReminders) =>
          updateNotifications({ ...notifications, activityReminders })
        }
      />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Meetup safety</Text>
      <View
        style={[
          styles.safetyCard,
          { backgroundColor: theme.surface, borderColor: theme.border }
        ]}
      >
        <Text style={[styles.rule, { color: theme.text }]}>
          • Meet only at the public, staffed venue in the confirmed lobby.
        </Text>
        <Text style={[styles.rule, { color: theme.text }]}>
          • Keep plans in group chat; Ruckus has no 1:1 DMs.
        </Text>
        <Text style={[styles.rule, { color: theme.text }]}>
          • Leave any situation that feels unsafe and contact emergency or campus safety
          services.
        </Text>
        <Text style={[styles.rule, { color: theme.text }]}>
          • Long-press a member or message to report privately.
        </Text>
      </View>
      <PrimaryButton
        label="Open safety center"
        variant="secondary"
        onPress={() => router.push('/safety')}
        style={styles.safetyButton}
      />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
      <PrimaryButton
        label="Sign out"
        variant="secondary"
        onPress={() => void signOut()}
      />
      <PrimaryButton
        label="Request account deletion"
        variant="danger"
        loading={deleting}
        onPress={confirmDeletion}
        style={styles.danger}
      />
      <Text style={[styles.deletionNote, { color: theme.textMuted }]}>
        Deletion is a trusted server workflow. The mobile app cannot delete Auth,
        attendance, or XP rows directly.
      </Text>
    </AppScreen>
  );
}

type SettingSwitchProps = {
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

function SettingSwitch({
  title,
  description,
  value,
  disabled,
  onChange
}: SettingSwitchProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.settingRow,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: disabled ? 0.5 : 1
        }
      ]}
    >
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
          {description}
        </Text>
      </View>
      <Switch
        accessibilityLabel={title}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    minHeight: tokens.touchTarget,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    marginBottom: tokens.space.md
  },
  backText: { fontSize: 13, fontWeight: '800' },
  sectionTitle: {
    marginTop: tokens.space.xl,
    marginBottom: tokens.space.sm,
    fontSize: 18,
    fontWeight: '900'
  },
  themeRow: { flexDirection: 'row', gap: tokens.space.sm },
  themeChoice: {
    minHeight: tokens.touchTarget,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.pill
  },
  themeText: { fontSize: 13, fontWeight: '900' },
  settingRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.sm
  },
  settingCopy: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '900' },
  settingDescription: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  safetyCard: {
    gap: tokens.space.sm,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg
  },
  safetyButton: { marginTop: tokens.space.sm },
  rule: { fontSize: 13, lineHeight: 19 },
  danger: { marginTop: tokens.space.md },
  deletionNote: { marginTop: tokens.space.sm, fontSize: 11, lineHeight: 16 }
});
