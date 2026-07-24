import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { parseCheckinPayload } from '@/features/checkin/checkin-parser';
import { redeemCheckinToken } from '@/features/checkin/checkin-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function ScanCheckinScreen() {
  const params = useLocalSearchParams<{ groupId: string; token?: string }>();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const initialToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const { isDemo } = useAuth();
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const consumedInitialToken = useRef(false);

  const redeem = useCallback(
    async (rawToken: string) => {
      if (!groupId || processing) return;
      setProcessing(true);
      setError('');
      try {
        const result = await redeemCheckinToken(rawToken, isDemo);
        router.replace({
          pathname: '/check-in/result',
          params: {
            groupId,
            success: 'true',
            already: String(result.alreadyCheckedIn),
            xp: String(result.xpAwarded)
          }
        });
      } catch {
        setError('This code expired, was replaced, or is not valid for your crew.');
        setProcessing(false);
      }
    },
    [groupId, isDemo, processing]
  );

  useEffect(() => {
    if (!initialToken || consumedInitialToken.current) return;
    consumedInitialToken.current = true;
    void redeem(initialToken);
  }, [initialToken, redeem]);

  const handleBarcode = ({ data }: { data: string }) => {
    if (!groupId || processing) return;
    try {
      const rawToken = parseCheckinPayload(data, groupId);
      void redeem(rawToken);
    } catch (scanError) {
      setError(
        scanError instanceof Error ? scanError.message : 'That code is not valid.'
      );
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <AppScreen title="Preparing camera">
        <Text style={{ color: theme.textMuted }}>Checking camera permission…</Text>
      </AppScreen>
    );
  }

  if (!permission.granted) {
    return (
      <AppScreen
        eyebrow="Event check-in"
        title="Camera permission"
        subtitle="Ruckus only uses the camera to scan the short-lived QR shown by your group host."
      >
        <PrimaryButton label="Allow camera" onPress={() => void requestPermission()} />
        {!permission.canAskAgain ? (
          <Text style={[styles.permissionNote, { color: theme.textMuted }]}>
            Camera access is blocked in system settings. Re-enable it there, then return
            to this screen.
          </Text>
        ) : null}
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll={false}
      eyebrow="Verified attendance"
      title="Scan the host’s QR"
      subtitle="Hold the code inside the frame. It expires quickly and only works for your confirmed crew."
    >
      <View style={[styles.cameraFrame, { borderColor: theme.primary }]}>
        <CameraView
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={processing ? undefined : handleBarcode}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.target} />
        {processing ? (
          <View style={styles.processing}>
            <Text style={styles.processingText}>Verifying securely…</Text>
          </View>
        ) : null}
      </View>
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: `${theme.danger}18` }]}>
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>
            {error}
          </Text>
          <PrimaryButton
            label="Scan again"
            variant="secondary"
            onPress={() => {
              setError('');
              setProcessing(false);
            }}
          />
        </View>
      ) : null}
      <PrimaryButton
        label="Cancel"
        variant="ghost"
        onPress={() =>
          router.replace({ pathname: '/group/[id]', params: { id: groupId ?? '' } })
        }
        style={styles.cancel}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  permissionNote: { marginTop: tokens.space.md, fontSize: 13, lineHeight: 19 },
  cameraFrame: {
    minHeight: 380,
    flex: 1,
    overflow: 'hidden',
    borderWidth: 3,
    borderRadius: tokens.radius.lg
  },
  target: {
    position: 'absolute',
    top: '21%',
    right: '13%',
    bottom: '21%',
    left: '13%',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: tokens.radius.md
  },
  processing: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090E1AAA'
  },
  processingText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  errorBox: {
    gap: tokens.space.sm,
    borderRadius: tokens.radius.md,
    padding: 12,
    marginTop: 12
  },
  error: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  cancel: { marginTop: tokens.space.sm }
});
