import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { ActionRow } from '@/components/ui/action-row';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  defaultNotificationPreferences,
  readNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences
} from '@/features/settings/preferences';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const themes = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
] as const;

type SaveNotice = { tone: 'info' | 'error'; message: string } | null;

export default function SettingsScreen() {
  const { isDemo, signOut } = useAuth();
  const { preference, setPreference, theme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    defaultNotificationPreferences
  );
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [saveNotice, setSaveNotice] = useState<SaveNotice>(null);

  useEffect(() => {
    let active = true;
    void readNotificationPreferences()
      .then((stored) => {
        if (active) setNotifications(stored);
      })
      .catch(() => {
        if (active) {
          setSaveNotice({
            tone: 'error',
            message: 'Notification preferences could not be loaded on this device.'
          });
        }
      })
      .finally(() => {
        if (active) setNotificationsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateNotifications = async (next: NotificationPreferences) => {
    const previous = notifications;
    setNotifications(next);
    setSaveNotice({
      tone: 'info',
      message: isDemo
        ? 'Demo preference saved on this device only. No push registration was changed.'
        : 'Saving notification preferences…'
    });
    try {
      await saveNotificationPreferences(next);
      setSaveNotice({
        tone: 'info',
        message: isDemo
          ? 'Demo preference saved on this device only. No push registration was changed.'
          : 'Preferences saved. Push registration will sync securely.'
      });
    } catch {
      setNotifications(previous);
      setSaveNotice({
        tone: 'error',
        message: 'Preferences were not saved. Your previous choices remain active.'
      });
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      isDemo ? 'Exit demo?' : 'Sign out of Ruckus?',
      isDemo
        ? 'This ends the local demo session. No real account is affected.'
        : 'You can sign in again with your verified university account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isDemo ? 'Exit demo' : 'Sign out',
          style: 'destructive',
          onPress: () => void signOut()
        }
      ]
    );
  };

  return (
    <AppScreen>
      <BackButton label="Profile" onPress={() => router.back()} />
      <Text style={[styles.heading, { color: theme.text }]}>Settings</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Manage appearance, notifications, safety, and your account.
      </Text>
      {isDemo ? (
        <InlineNotice message="Changes in this demo stay on this device." />
      ) : null}

      <SettingsSection title="Appearance">
        <SegmentedControl
          accessibilityLabel="Appearance preference"
          value={preference}
          options={themes}
          onChange={setPreference}
        />
        <Text style={[styles.help, { color: theme.textMuted }]}>
          System follows the light or dark setting on this device.
        </Text>
      </SettingsSection>

      <SettingsSection title="Notifications">
        {notificationsLoading ? (
          <InlineNotice message="Loading notification preferences…" />
        ) : (
          <View style={styles.switches}>
            <SettingSwitch
              title="Push notifications"
              description="Master control for Ruckus activity updates."
              value={notifications.enabled}
              onChange={(enabled) =>
                void updateNotifications({ ...notifications, enabled })
              }
            />
            <SettingSwitch
              title="Group chat"
              description="Updates when another group member posts."
              value={notifications.enabled && notifications.chatMessages}
              disabled={!notifications.enabled}
              onChange={(chatMessages) =>
                void updateNotifications({ ...notifications, chatMessages })
              }
            />
            <SettingSwitch
              title="Activity timing"
              description="Confirmation deadlines, check-in availability, and event start."
              value={notifications.enabled && notifications.activityReminders}
              disabled={!notifications.enabled}
              onChange={(activityReminders) =>
                void updateNotifications({ ...notifications, activityReminders })
              }
            />
          </View>
        )}
        {saveNotice ? (
          <InlineNotice tone={saveNotice.tone} message={saveNotice.message} />
        ) : null}
      </SettingsSection>

      <SettingsSection title="Privacy & safety">
        <View style={styles.rows}>
          <ActionRow
            mark="!"
            title="Safety center"
            description="Public-meeting guidance, privacy boundaries, and emergency information."
            tone="danger"
            onPress={() => router.push('/safety')}
          />
          <ActionRow
            mark="rules"
            title="Community guidelines"
            description="Read the conduct rules for groups, chat, and activities."
            tone="accent"
            onPress={() => router.push('/safety/guidelines')}
          />
          <ActionRow
            mark="info"
            title="Privacy & data use"
            description="Review what the app uses and what it intentionally does not collect."
            onPress={() => router.push('/legal')}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Support & legal">
        <View style={styles.rows}>
          <ActionRow
            mark="help"
            title="Campus support"
            description="No verified campus support contact is configured in this build."
            status="Not configured"
            disabled
            onPress={() => undefined}
          />
          <ActionRow
            mark="document"
            title="Terms and privacy documents"
            description="Approved production document URLs must be supplied by the deploying organization."
            status="Pending"
            disabled
            onPress={() => undefined}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Account">
        <PrimaryButton
          label={isDemo ? 'Exit demo' : 'Sign out'}
          variant="secondary"
          onPress={confirmSignOut}
        />
        <PrimaryButton
          label="Account deletion"
          variant="danger"
          onPress={() => router.push('/account-deletion')}
          style={styles.danger}
        />
        <Text style={[styles.help, { color: theme.textMuted }]}>
          Deletion uses the trusted seven-day server workflow. The app never deletes
          authentication, attendance, or XP records directly.
        </Text>
      </SettingsSection>
    </AppScreen>
  );
}

function SettingsSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
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
          backgroundColor: theme.surfaceElevated,
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
        accessibilityHint={description}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.surfaceStrong, true: theme.accent }}
        thumbColor={value ? tokens.color.white : theme.surfaceElevated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.bold,
    letterSpacing: -1
  },
  subtitle: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    fontWeight: tokens.weight.medium
  },
  section: { marginTop: tokens.space.xl },
  sectionTitle: {
    marginBottom: tokens.space.md,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold
  },
  help: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  switches: { gap: tokens.space.sm },
  settingRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  settingCopy: { flex: 1 },
  settingTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  settingDescription: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  rows: { gap: tokens.space.sm },
  danger: { marginTop: tokens.space.sm }
});
