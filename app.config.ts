import type { ExpoConfig, ConfigContext } from 'expo/config';

const bundleIdentifier = 'com.campusclash.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Campus Clash',
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
      backgroundColor: '#7C3AED'
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
          'Campus Clash uses your camera only to scan event check-in QR codes.',
        recordAudioAndroid: false,
        barcodeScannerEnabled: true
      }
    ],
    [
      'expo-notifications',
      {
        color: '#7C3AED',
        defaultChannel: 'activity-updates'
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
        backgroundColor: '#111827',
        imageWidth: 120
      }
    ]
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  },
  extra: {
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
});
