import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import {
  CheckinScanError,
  parseCheckinPayload,
  type CheckinScanIssue
} from '@/features/checkin/checkin-parser';
import { redeemCheckinToken } from '@/features/checkin/checkin-service';
import { useGroupLobby } from '@/features/groups/use-groups';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type ScanIssue = CheckinScanIssue | 'expired-or-replaced' | 'network' | 'unknown';

function scanIssueFromError(error: unknown): {
  kind: ScanIssue;
  message: string;
} {
  if (error instanceof CheckinScanError) {
    return { kind: error.issue, message: error.message };
  }
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (
    ['network', 'fetch', 'offline', 'connection', 'timed out'].some((term) =>
      message.includes(term)
    )
  ) {
    return {
      kind: 'network',
      message: 'Ruckus couldn’t reach the secure check-in service. Reconnect and retry.'
    };
  }
  return {
    kind: 'expired-or-replaced',
    message:
      'That code expired, was replaced, or no longer applies to this confirmed crew.'
  };
}

export default function ScanCheckinScreen() {
  const params = useLocalSearchParams<{ groupId: string; token?: string }>();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const initialToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const { isDemo } = useAuth();
  const { theme } = useTheme();
  const { height } = useWindowDimensions();
  const network = useNetInfo();
  const lobby = useGroupLobby(groupId ?? '');
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [issue, setIssue] = useState<{
    kind: ScanIssue;
    message: string;
  } | null>(null);
  const consumedInitialToken = useRef(false);

  const redeem = useCallback(
    async (rawToken: string) => {
      if (!groupId || processing) return;
      if (network.isConnected === false) {
        setIssue({
          kind: 'network',
          message:
            'Ruckus couldn’t reach the secure check-in service. Reconnect and retry.'
        });
        return;
      }
      setProcessing(true);
      setIssue(null);
      try {
        const result = await redeemCheckinToken(rawToken, isDemo);
        router.replace({
          pathname: '/check-in/result',
          params: {
            groupId,
            already: String(result.alreadyCheckedIn),
            xp: String(result.xpAwarded),
            demo: String(isDemo)
          }
        });
      } catch (error) {
        setIssue(scanIssueFromError(error));
        setProcessing(false);
      }
    },
    [groupId, isDemo, network.isConnected, processing]
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
      setIssue(scanIssueFromError(scanError));
      setProcessing(false);
    }
  };

  const backToLobby = () =>
    router.replace({ pathname: '/group/[id]', params: { id: groupId ?? '' } });

  if (!permission) {
    return (
      <AppScreen
        eyebrow="Secure check-in"
        title="Preparing your camera."
        subtitle="Checking device permission before the scanner opens."
      >
        <BackButton label="Crew lobby" onPress={backToLobby} />
        <LoadingSkeleton style={styles.permissionSkeleton} />
      </AppScreen>
    );
  }

  if (!permission.granted) {
    return (
      <AppScreen
        eyebrow="Secure check-in"
        title="Camera access is needed."
        subtitle="Ruckus uses the camera only to scan the host’s short-lived QR. No photo or video is saved."
      >
        <BackButton label="Crew lobby" onPress={backToLobby} />
        <View
          style={[
            styles.permissionCard,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
          ]}
        >
          <View style={[styles.cameraMark, { backgroundColor: theme.accentMuted }]}>
            <Text style={[styles.cameraMarkText, { color: theme.text }]}>⌁</Text>
          </View>
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            {permission.canAskAgain
              ? 'Allow one-purpose camera access'
              : 'Camera access is blocked'}
          </Text>
          <Text style={[styles.permissionCopy, { color: theme.textMuted }]}>
            {permission.canAskAgain
              ? 'You stay in control, and Ruckus never stores the camera feed.'
              : 'Re-enable camera access in system settings, then return here to scan.'}
          </Text>
          {permission.canAskAgain ? (
            <PrimaryButton
              label="Allow camera"
              leadingIcon="↗"
              onPress={() => void requestPermission()}
              style={styles.permissionButton}
            />
          ) : null}
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false} contentStyle={styles.screen}>
      <BackButton label="Crew lobby" onPress={backToLobby} />
      <View style={styles.heading}>
        <StatusPill label={isDemo ? 'DEMO SCANNER' : 'SECURE CHECK-IN'} tone="success" />
        <Text style={[styles.title, { color: theme.text }]}>Scan the host’s QR.</Text>
        <Text numberOfLines={2} style={[styles.context, { color: theme.textMuted }]}>
          {lobby.data?.title ?? 'Your confirmed activity'} · The code rotates quickly and
          works only for this crew.
        </Text>
      </View>

      {network.isConnected === false ? (
        <InlineNotice
          icon="↯"
          tone="offline"
          message="A network connection is required to verify attendance securely."
        />
      ) : null}

      <View
        style={[
          styles.cameraFrame,
          {
            minHeight: height < 650 ? 250 : 340,
            borderColor: issue ? theme.danger : theme.primary
          }
        ]}
      >
        <CameraView
          accessibilityLabel="QR code camera scanner"
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={processing || issue ? undefined : handleBarcode}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.target}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        {processing ? (
          <View style={styles.processing}>
            <ActivityIndicator color={tokens.color.ruckus} size="large" />
            <Text style={styles.processingTitle}>Verifying securely</Text>
            <Text style={styles.processingCopy}>
              Checking crew, event window, and one-time attendance…
            </Text>
          </View>
        ) : null}
      </View>

      {issue ? (
        <View>
          <InlineNotice
            tone="error"
            icon="!"
            message={`${issue.kind === 'wrong-group' ? 'Wrong crew — ' : issue.kind === 'invalid-code' ? 'Invalid code — ' : issue.kind === 'network' ? 'Network failure — ' : 'Code unavailable — '}${issue.message}`}
          />
          <PrimaryButton
            label="Scan another code"
            variant="secondary"
            onPress={() => {
              setIssue(null);
              setProcessing(false);
            }}
          />
        </View>
      ) : (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Center the entire code in the frame. Raw QR credentials are never displayed or
          logged.
        </Text>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: tokens.space.md },
  permissionSkeleton: {
    flex: 1,
    minHeight: 360,
    borderRadius: tokens.radius.xl
  },
  permissionCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.xl
  },
  cameraMark: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.lg
  },
  cameraMarkText: { fontSize: 32, fontWeight: tokens.weight.black },
  permissionTitle: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.black,
    textAlign: 'center'
  },
  permissionCopy: {
    marginTop: tokens.space.sm,
    maxWidth: 330,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  },
  permissionButton: { width: '100%', marginTop: tokens.space.lg },
  heading: { marginBottom: tokens.space.md },
  title: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
    letterSpacing: -1
  },
  context: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.medium
  },
  cameraFrame: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 3,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.color.ink
  },
  target: {
    position: 'absolute',
    top: '18%',
    right: '12%',
    bottom: '18%',
    left: '12%'
  },
  corner: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderColor: tokens.color.white
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4
  },
  processing: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.xl,
    backgroundColor: 'rgba(9,10,13,0.9)'
  },
  processingTitle: {
    marginTop: tokens.space.md,
    color: tokens.color.white,
    fontSize: 20,
    fontWeight: tokens.weight.black
  },
  processingCopy: {
    marginTop: tokens.space.sm,
    maxWidth: 270,
    color: '#B6BBC4',
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  },
  hint: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  }
});
