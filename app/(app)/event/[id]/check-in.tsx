import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { redeemEventCheckinCode } from '@/features/events/event-service';
import { useEventDetail } from '@/features/events/use-events';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function EventCheckinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const { isDemo } = useAuth();
  const { theme } = useTheme();
  const network = useNetInfo();
  const event = useEventDetail(eventId ?? '');
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!permission || event.isLoading) {
    return (
      <AppScreen>
        <BackButton />
        <LoadingSkeleton style={styles.loading} />
      </AppScreen>
    );
  }
  if (!eventId || event.isError || event.data?.ownRsvp?.status !== 'confirmed') {
    return (
      <AppScreen>
        <BackButton />
        <InlineNotice
          tone="error"
          icon="lock"
          message="A confirmed RSVP is required before an event check-in can be verified."
        />
      </AppScreen>
    );
  }
  if (!permission.granted) {
    return (
      <AppScreen
        title="Camera access needed"
        subtitle="Ruckus uses the camera only to scan the host’s short-lived QR code."
      >
        <BackButton />
        <View
          style={[
            styles.permission,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
          ]}
        >
          <AppIcon name="qrCode" color={theme.primary} size={34} />
          <Text style={[styles.permissionCopy, { color: theme.textMuted }]}>
            No photo, video, or camera feed is saved.
          </Text>
          <PrimaryButton
            label={permission.canAskAgain ? 'Allow camera' : 'Open system settings'}
            onPress={() =>
              permission.canAskAgain
                ? void requestPermission()
                : void Linking.openSettings()
            }
          />
        </View>
      </AppScreen>
    );
  }

  const scan = ({ data }: { data: string }) => {
    if (processing || success || network.isConnected === false) return;
    setProcessing(true);
    setMessage(null);
    void redeemEventCheckinCode(data, eventId, isDemo)
      .then((result) => {
        setSuccess(true);
        setMessage(
          result.alreadyCheckedIn
            ? 'Attendance was already verified. No duplicate XP was awarded.'
            : 'Attendance verified. Your participation XP was awarded once.'
        );
      })
      .catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        setMessage(
          text.includes('INVALID')
            ? 'That QR is invalid, expired, replaced, or belongs to another event.'
            : 'Check-in could not be verified. Reconnect and ask the host to rotate the QR.'
        );
        setProcessing(false);
      });
  };

  return (
    <AppScreen scroll={false} contentStyle={styles.screen}>
      <BackButton />
      <Text style={[styles.title, { color: theme.text }]}>Scan event check-in</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {event.data.title} · codes expire after 60 seconds.
      </Text>
      {network.isConnected === false ? (
        <InlineNotice
          tone="offline"
          icon="warning"
          message="A connection is required to verify attendance."
        />
      ) : null}
      <View
        style={[styles.camera, { borderColor: success ? theme.success : theme.primary }]}
      >
        <CameraView
          accessibilityLabel="Event check-in QR scanner"
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={processing || success ? undefined : scan}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.target} />
      </View>
      {message ? (
        <InlineNotice
          tone={success ? 'success' : 'error'}
          icon={success ? 'check' : 'warning'}
          message={message}
        />
      ) : null}
      {success ? (
        <PrimaryButton
          label="Back to event"
          onPress={() =>
            router.replace({ pathname: '/event/[id]', params: { id: eventId } })
          }
        />
      ) : message ? (
        <PrimaryButton
          label="Scan another code"
          variant="secondary"
          onPress={() => {
            setMessage(null);
            setProcessing(false);
          }}
        />
      ) : (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Center the entire host QR in the frame. The raw credential is never logged.
        </Text>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: tokens.space.md },
  loading: { flex: 1, minHeight: 360, borderRadius: tokens.radius.lg },
  permission: {
    alignItems: 'center',
    gap: tokens.space.lg,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xl
  },
  permissionCopy: {
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    textAlign: 'center'
  },
  title: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.bold
  },
  subtitle: {
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.md,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  },
  camera: {
    flex: 1,
    minHeight: 300,
    overflow: 'hidden',
    borderWidth: 2,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.ink,
    marginBottom: tokens.space.md
  },
  target: {
    position: 'absolute',
    top: '20%',
    right: '14%',
    bottom: '20%',
    left: '14%',
    borderWidth: 3,
    borderColor: tokens.color.ruckus,
    borderRadius: tokens.radius.md
  },
  hint: {
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    textAlign: 'center'
  }
});
