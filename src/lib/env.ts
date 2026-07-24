import { z } from 'zod';

export type AppEnvironment = 'development' | 'preview' | 'production';
export type BackendMode = 'connected' | 'demo' | 'configuration-error';

export type RawClientEnvironment = {
  EXPO_PUBLIC_APP_ENV?: string | undefined;
  EXPO_PUBLIC_SUPABASE_URL?: string | undefined;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string | undefined;
  EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN?: string | undefined;
  EXPO_PUBLIC_EAS_PROJECT_ID?: string | undefined;
  EXPO_PUBLIC_SENTRY_DSN?: string | undefined;
};

export type ClientEnv = {
  appEnvironment: AppEnvironment;
  backendMode: BackendMode;
  isBackendConfigured: boolean;
  isDemoAvailable: boolean;
  configurationError: string | null;
  supabaseUrl: string | undefined;
  supabasePublishableKey: string | undefined;
  universityEmailDomain: string;
  easProjectId: string | undefined;
  sentryDsn: string | undefined;
};

export class PublicEnvironmentError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'PublicEnvironmentError';
  }
}

const appEnvironmentSchema = z.enum(['development', 'preview', 'production']);
const emailDomainSchema = z
  .string()
  .min(3)
  .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i);
const uuidSchema = z.uuid();

function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validPublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

function configurationFailure(
  appEnvironment: AppEnvironment,
  message: string,
  shared: Pick<ClientEnv, 'universityEmailDomain' | 'easProjectId' | 'sentryDsn'>
): ClientEnv {
  const explanation = `Backend configuration error: ${message}`;
  if (appEnvironment !== 'development') {
    throw new PublicEnvironmentError(
      `${explanation}. ${appEnvironment} builds require valid public Supabase credentials.`
    );
  }
  return {
    appEnvironment,
    backendMode: 'configuration-error',
    isBackendConfigured: false,
    isDemoAvailable: false,
    configurationError: explanation,
    supabaseUrl: undefined,
    supabasePublishableKey: undefined,
    ...shared
  };
}

export function resolveClientEnvironment(raw: RawClientEnvironment): ClientEnv {
  const appEnvironmentValue = optionalValue(raw.EXPO_PUBLIC_APP_ENV) ?? 'development';
  const appEnvironmentResult = appEnvironmentSchema.safeParse(appEnvironmentValue);
  if (!appEnvironmentResult.success) {
    throw new PublicEnvironmentError(
      'EXPO_PUBLIC_APP_ENV must be development, preview, or production.'
    );
  }
  const appEnvironment = appEnvironmentResult.data;

  const universityEmailDomain =
    optionalValue(raw.EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN) ?? 'example.edu';
  const easProjectId = optionalValue(raw.EXPO_PUBLIC_EAS_PROJECT_ID);
  const sentryDsn = optionalValue(raw.EXPO_PUBLIC_SENTRY_DSN);
  const shared = { universityEmailDomain, easProjectId, sentryDsn };

  if (!emailDomainSchema.safeParse(universityEmailDomain).success) {
    return configurationFailure(
      appEnvironment,
      'EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN must be a valid domain',
      shared
    );
  }
  if (easProjectId && !uuidSchema.safeParse(easProjectId).success) {
    return configurationFailure(
      appEnvironment,
      'EXPO_PUBLIC_EAS_PROJECT_ID must be a UUID when provided',
      shared
    );
  }
  if (sentryDsn && !validPublicUrl(sentryDsn)) {
    return configurationFailure(
      appEnvironment,
      'EXPO_PUBLIC_SENTRY_DSN must be a valid HTTP(S) URL when provided',
      shared
    );
  }

  const supabaseUrl = optionalValue(raw.EXPO_PUBLIC_SUPABASE_URL);
  const supabasePublishableKey = optionalValue(raw.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!supabaseUrl && !supabasePublishableKey) {
    if (appEnvironment !== 'development') {
      return configurationFailure(
        appEnvironment,
        'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are missing',
        shared
      );
    }
    return {
      appEnvironment,
      backendMode: 'demo',
      isBackendConfigured: false,
      isDemoAvailable: true,
      configurationError: null,
      supabaseUrl: undefined,
      supabasePublishableKey: undefined,
      ...shared
    };
  }

  if (!supabaseUrl) {
    return configurationFailure(
      appEnvironment,
      'EXPO_PUBLIC_SUPABASE_URL is missing',
      shared
    );
  }
  if (!validPublicUrl(supabaseUrl)) {
    return configurationFailure(
      appEnvironment,
      'EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL',
      shared
    );
  }
  if (!supabasePublishableKey) {
    return configurationFailure(
      appEnvironment,
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing',
      shared
    );
  }
  if (supabasePublishableKey.length < 20) {
    return configurationFailure(
      appEnvironment,
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is malformed',
      shared
    );
  }

  return {
    appEnvironment,
    backendMode: 'connected',
    isBackendConfigured: true,
    isDemoAvailable: false,
    configurationError: null,
    supabaseUrl,
    supabasePublishableKey,
    ...shared
  };
}

export const env = resolveClientEnvironment({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN: process.env.EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN,
  EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN
});
