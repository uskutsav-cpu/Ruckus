import type { ExpoConfig, ConfigContext } from 'expo/config';

const bundleIdentifier = 'com.campusclash.app';

function isValidPublicUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const protectedBuild = appEnvironment === 'preview' || appEnvironment === 'production';

  if (
    protectedBuild &&
    (!isValidPublicUrl(supabaseUrl) || !publishableKey || publishableKey.length < 20)
  ) {
    throw new Error(
      `${appEnvironment} builds require a valid EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.`
    );
  }

  const backendMode =
    isValidPublicUrl(supabaseUrl) && publishableKey && publishableKey.length >= 20
      ? 'connected'
      : !supabaseUrl && !publishableKey
        ? 'demo'
        : 'configuration-error';

  return {
    ...config,
    name: 'Ruckus',
    slug: 'campus-clash',
    scheme: 'campusclash',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    assetBundlePatterns: ['assets/**/*'],
    ios: {
      bundleIdentifier,
      supportsTablet: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: bundleIdentifier,
      adaptiveIcon: {
        backgroundColor: '#C8F53D'
      },
      permissions: ['CAMERA'],
      predictiveBackGestureEnabled: true
    },
    plugins: [
      'expo-router',
      [
        'expo-camera',
        {
          cameraPermission:
            'Ruckus uses your camera only to scan event check-in QR codes.',
          recordAudioAndroid: false,
          barcodeScannerEnabled: true
        }
      ],
      [
        'expo-notifications',
        {
          color: '#C8F53D',
          defaultChannel: 'activity-updates'
        }
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Ruckus accesses a photo only when you choose an optional profile image.'
        }
      ],
      [
        'expo-secure-store',
        {
          configureAndroidBackup: true
        }
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#090A0D',
          imageWidth: 120
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      ...config.extra,
      appEnvironment,
      backendMode,
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? undefined
      }
    },
    runtimeVersion: {
      policy: 'appVersion'
    },
    updates: {
      fallbackToCacheTimeout: 0
    }
  };
};
