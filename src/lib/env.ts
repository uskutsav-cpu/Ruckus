import { z } from 'zod';

const rawEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  universityEmailDomain: process.env.EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN ?? 'example.edu',
  easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN
};

const clientEnvSchema = z.object({
  supabaseUrl: z.url().optional(),
  supabasePublishableKey: z.string().min(20).optional(),
  universityEmailDomain: z
    .string()
    .min(3)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i),
  easProjectId: z.uuid().optional(),
  sentryDsn: z.url().optional()
});

const result = clientEnvSchema.safeParse(rawEnv);

if (!result.success && !__DEV__) {
  throw new Error(`Invalid public environment: ${z.prettifyError(result.error)}`);
}

const parsed = result.success
  ? result.data
  : {
      universityEmailDomain: 'example.edu'
    };

export const env = {
  ...parsed,
  isBackendConfigured: Boolean(parsed.supabaseUrl && parsed.supabasePublishableKey),
  supabaseUrl: parsed.supabaseUrl ?? 'http://127.0.0.1:54321',
  supabasePublishableKey:
    parsed.supabasePublishableKey ?? 'development-publishable-key-not-configured'
} as const;

export type ClientEnv = typeof env;
