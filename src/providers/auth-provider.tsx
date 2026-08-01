import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { env } from '@/lib/env';
import {
  clearPendingReferralCode,
  getPendingReferralCode
} from '@/features/referrals/pending-referral';
import { logger } from '@/lib/logger';
import { requireSupabase } from '@/lib/supabase';
import type { InterestRow, ProfileRow } from '@/types/database';

type AuthUser = {
  id: string;
  email: string;
  emailConfirmedAt: string | null;
};

type AuthResult = { error: string | null };

type CompleteOnboardingInput = {
  displayName: string;
  graduationYear: number;
  bio: string;
  interestIds: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  profile: ProfileRow | null;
  interests: InterestRow[];
  isLoading: boolean;
  isDemo: boolean;
  isPasswordRecovery: boolean;
  signUp: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<AuthResult>;
  signIn: (input: { email: string; password: string }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  attestAgeAndSafety: () => Promise<AuthResult>;
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
  enterDemo: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const demoSessionKey = 'campus-clash.demo-session';
const phonePreviewParam = 'phonePreview';

const demoProfile: ProfileRow = {
  id: '10000000-0000-4000-8000-000000000001',
  campus_id: '00000000-0000-4000-8000-000000000001',
  university_email: 'demo1@example.edu',
  display_name: 'Maya',
  avatar_path: null,
  bio: 'Always down for a new campus adventure.',
  graduation_year: 2028,
  role: 'student',
  username: 'maya_demo',
  trust_level: 0,
  suspended_until: null,
  banned_at: null,
  age_attested: true,
  age_attested_at: new Date().toISOString(),
  safety_acknowledged_at: new Date().toISOString(),
  email_domain_verified_at: new Date().toISOString(),
  onboarding_completed_at: new Date().toISOString(),
  deletion_requested_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

function isOnboardingPhonePreview(): boolean {
  if (!__DEV__ || env.backendMode !== 'demo' || typeof window === 'undefined') {
    return false;
  }
  return (
    new URLSearchParams(window.location.search).get(phonePreviewParam) === 'onboarding'
  );
}

function toAuthUser(
  user: { id: string; email?: string; email_confirmed_at?: string | null } | null
): AuthUser | null {
  if (!user?.email) return null;
  return {
    id: user.id,
    email: user.email,
    emailConfirmedAt: user.email_confirmed_at ?? null
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [interests, setInterests] = useState<InterestRow[]>([]);
  const [isLoading, setIsLoading] = useState(env.backendMode !== 'configuration-error');
  const [isDemo, setIsDemo] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const referralAttempt = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = requireSupabase();
    const [{ data: profileData, error: profileError }, { data: interestData }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('interests').select('*').order('sort_order')
      ]);

    if (profileError) {
      logger.warn('auth.profile_load_failed', {
        code: profileError.code,
        message: profileError.message
      });
      setProfile(null);
      return;
    }
    setProfile(profileData);
    setInterests(interestData ?? []);
  }, []);

  const handleAuthUrl = useCallback(async (url: string) => {
    try {
      const supabase = requireSupabase();
      const parsed = new URL(url);
      const code = parsed.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        return;
      }

      const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
      const accessToken = fragment.get('access_token');
      const refreshToken = fragment.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) throw error;
      }
    } catch (error) {
      logger.warn('auth.deep_link_failed', { message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    let active = true;

    if (env.backendMode === 'configuration-error') {
      return () => {
        active = false;
      };
    }

    if (env.backendMode === 'demo') {
      if (isOnboardingPhonePreview()) {
        void Promise.resolve().then(() => {
          if (!active) return;
          setIsDemo(true);
          setUser({
            id: demoProfile.id,
            email: demoProfile.university_email,
            emailConfirmedAt: demoProfile.email_domain_verified_at
          });
          setProfile({ ...demoProfile, onboarding_completed_at: null });
          setIsLoading(false);
        });
        return () => {
          active = false;
        };
      }
      void AsyncStorage.getItem(demoSessionKey).then((value) => {
        if (!active) return;
        if (value === 'active') {
          setIsDemo(true);
          setUser({
            id: demoProfile.id,
            email: demoProfile.university_email,
            emailConfirmedAt: demoProfile.email_domain_verified_at
          });
          setProfile(demoProfile);
        }
        setIsLoading(false);
      });
      return () => {
        active = false;
      };
    }

    const supabase = requireSupabase();
    void Promise.all([supabase.auth.getSession(), Linking.getInitialURL()]).then(
      async ([{ data }, initialUrl]) => {
        if (!active) return;
        if (initialUrl) await handleAuthUrl(initialUrl);
        const nextUser = toAuthUser(data.session?.user ?? null);
        setUser(nextUser);
        if (nextUser) await loadProfile(nextUser.id);
        if (active) setIsLoading(false);
      }
    );

    const authSubscription = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      const nextUser = toAuthUser(session?.user ?? null);
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setInterests([]);
      } else {
        setTimeout(() => void loadProfile(nextUser.id), 0);
      }
      setIsLoading(false);
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthUrl(url);
    });

    return () => {
      active = false;
      authSubscription.data.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [handleAuthUrl, loadProfile]);

  useEffect(() => {
    if (
      isDemo ||
      !user ||
      !profile?.onboarding_completed_at ||
      referralAttempt.current === user.id
    ) {
      return;
    }
    referralAttempt.current = user.id;
    void getPendingReferralCode().then(async (code) => {
      if (!code) return;
      const { error } = await requireSupabase().rpc('attribute_referral', {
        referral_code: code
      });
      if (error) {
        logger.warn('referral.pending_attribution_failed', {
          code: error.code,
          message: error.message
        });
        return;
      }
      await clearPendingReferralCode();
      logger.info('referral.pending_attributed');
    });
  }, [isDemo, profile?.onboarding_completed_at, user]);

  const signUp = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      if (!env.isBackendConfigured) {
        return { error: 'Configure Supabase to test real email registration.' };
      }
      const supabase = requireSupabase();
      const { error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: Linking.createURL('auth/callback'),
          data: { display_name: input.displayName }
        }
      });
      return { error: error?.message ?? null };
    },
    []
  );

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    if (!env.isBackendConfigured) {
      return {
        error: env.configurationError ?? 'Use local demo until Supabase is configured.'
      };
    }
    const supabase = requireSupabase();
    const { error } = await supabase.auth.signInWithPassword(input);
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (isDemo) {
      await AsyncStorage.removeItem(demoSessionKey);
      setIsDemo(false);
      setUser(null);
      setProfile(null);
      return;
    }
    await requireSupabase().auth.signOut();
  }, [isDemo]);

  const resendVerification = useCallback(async (email: string) => {
    if (!env.isBackendConfigured) {
      return { error: 'Email delivery requires a configured Supabase project.' };
    }
    const supabase = requireSupabase();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: Linking.createURL('auth/callback') }
    });
    return { error: error?.message ?? null };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!env.isBackendConfigured) {
      return { error: 'Email delivery requires a configured Supabase project.' };
    }
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('auth/callback')
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!env.isBackendConfigured) {
      return { error: 'Password recovery requires a configured Supabase project.' };
    }
    const supabase = requireSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    setIsPasswordRecovery(false);
    await supabase.auth.signOut();
    return { error: null };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user && !isDemo) await loadProfile(user.id);
  }, [isDemo, loadProfile, user]);

  const attestAgeAndSafety = useCallback(async () => {
    if (isDemo) return { error: null };
    const supabase = requireSupabase();
    const { data, error } = await supabase.rpc('attest_age_and_safety');
    if (data) setProfile(data);
    return { error: error?.message ?? null };
  }, [isDemo]);

  const completeOnboarding = useCallback(
    async (input: CompleteOnboardingInput) => {
      if (isDemo) return { error: null };
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('complete_onboarding', {
        display_name_value: input.displayName,
        graduation_year_value: input.graduationYear,
        bio_value: input.bio,
        interest_ids: input.interestIds
      });
      if (data) setProfile(data);
      return { error: error?.message ?? null };
    },
    [isDemo]
  );

  const enterDemo = useCallback(async () => {
    if (!env.isDemoAvailable) {
      logger.warn('demo.entry_unavailable', { backendMode: env.backendMode });
      return;
    }
    await AsyncStorage.setItem(demoSessionKey, 'active');
    setIsDemo(true);
    setUser({
      id: demoProfile.id,
      email: demoProfile.university_email,
      emailConfirmedAt: demoProfile.email_domain_verified_at
    });
    setProfile(demoProfile);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      interests,
      isLoading,
      isDemo,
      isPasswordRecovery,
      signUp,
      signIn,
      signOut,
      resendVerification,
      requestPasswordReset,
      updatePassword,
      attestAgeAndSafety,
      completeOnboarding,
      refreshProfile,
      enterDemo
    }),
    [
      attestAgeAndSafety,
      completeOnboarding,
      enterDemo,
      interests,
      isDemo,
      isPasswordRecovery,
      isLoading,
      profile,
      refreshProfile,
      requestPasswordReset,
      resendVerification,
      signIn,
      signOut,
      signUp,
      updatePassword,
      user
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
