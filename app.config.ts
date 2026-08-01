import type { ExpoConfig, ConfigContext } from 'expo/config';

const bundleIdentifier = 'com.campusclash.app';
const appEnvironments = ['development', 'staging', 'production'] as const;
const hostedProjectRefPattern = /^[a-z0-9]{20}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const supabaseProjectRef = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF?.trim();
  const universityEmailDomain = process.env.EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN?.trim();
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  const buildTarget = process.env.RUCKUS_BUILD_TARGET?.trim();
  const protectedBuild = appEnvironment === 'staging' || appEnvironment === 'production';

  if (!appEnvironments.includes(appEnvironment as (typeof appEnvironments)[number])) {
    throw new Error('EXPO_PUBLIC_APP_ENV must be development, staging, or production.');
  }

  if (protectedBuild && buildTarget !== appEnvironment) {
    throw new Error(
      `${appEnvironment} config requires RUCKUS_BUILD_TARGET=${appEnvironment}. Use the matching EAS build profile.`
    );
  }

  if (protectedBuild) {
    const expectedSupabaseUrl = supabaseProjectRef
      ? `https://${supabaseProjectRef}.supabase.co`
      : undefined;
    const hasValidHostedConfiguration =
      isValidPublicUrl(supabaseUrl) &&
      Boolean(publishableKey && publishableKey.length >= 20) &&
      Boolean(supabaseProjectRef && hostedProjectRefPattern.test(supabaseProjectRef)) &&
      supabaseUrl === expectedSupabaseUrl &&
      Boolean(easProjectId && uuidPattern.test(easProjectId)) &&
      Boolean(universityEmailDomain);

    if (!hasValidHostedConfiguration) {
      throw new Error(
        `${appEnvironment} builds require a matching hosted Supabase URL/project ref, a publishable key, a university domain, and an EAS project UUID.`
      );
    }
  }

  if (appEnvironment === 'staging' && universityEmailDomain !== 'utexas.edu') {
    throw new Error(
      'Staging is restricted to the UT Austin pilot and requires EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN=utexas.edu.'
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
    scheme: ['ruckus', 'campusclash'],
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/brand/icon.png',
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
        foregroundImage: './assets/brand/adaptive-icon.png',
        backgroundColor: '#C8F53D'
      },
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
      predictiveBackGestureEnabled: true
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-calendar',
        {
          writeOnlyAccess: true,
          writeOnlyCalendarPermission:
            'Ruckus adds an event only when you choose Add to calendar.'
        }
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Ruckus uses your camera only to scan event check-in QR codes.',
          microphonePermission: false,
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
          image: './assets/brand/splash-icon.png',
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
      supabaseProjectRef,
      eas: {
        projectId: easProjectId
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
