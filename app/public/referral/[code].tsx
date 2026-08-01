import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { AppScreen } from '@/components/ui/app-screen';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { applyReferralCode } from '@/features/profile/account-tools-service';
import {
  clearPendingReferralCode,
  normalizeReferralCode,
  savePendingReferralCode
} from '@/features/referrals/pending-referral';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function PublicReferralScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeReferralCode(rawCode ?? '');
  const { isDemo, user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (code) void savePendingReferralCode(code);
  }, [code]);

  const continueWithCode = async () => {
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      await savePendingReferralCode(code);
      if (user) {
        await applyReferralCode(code, isDemo);
        await clearPendingReferralCode();
        router.replace('/privacy-and-growth');
      } else {
        router.push('/sign-up');
      }
    } catch {
      setError(
        'This code could not be applied. It may already be used, belong to another campus, or belong to your own account.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.screen}>
      <PublicHeader />
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: theme.textMuted }]}>Campus referral</Text>
        <Text style={[styles.title, { color: theme.text }]}>Join Ruckus together.</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Create a verified campus account with this referral. No reward is earned for
          signup alone—the referral qualifies only after your first verified event
          check-in.
        </Text>
        {code ? (
          <View style={[styles.codeCard, { backgroundColor: theme.accentMuted }]}>
            <Text style={[styles.codeLabel, { color: theme.textMuted }]}>
              Referral code
            </Text>
            <Text style={[styles.code, { color: theme.text }]}>{code}</Text>
          </View>
        ) : (
          <InlineNotice
            tone="error"
            message="This referral link is invalid or incomplete."
          />
        )}
        {error ? <InlineNotice tone="error" message={error} /> : null}
        <InlineNotice message="Self-referrals, duplicate attribution, and cross-campus codes are rejected by the server." />
        <PrimaryButton
          label={user ? 'Apply referral' : 'Create verified account'}
          disabled={!code}
          loading={loading}
          onPress={() => void continueWithCode()}
        />
        <PrimaryButton
          label="Browse Ruckus"
          variant="ghost"
          onPress={() => router.replace('/public')}
        />
      </View>
      <PublicFooter />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: tokens.space.md },
  content: { flex: 1, justifyContent: 'center', paddingVertical: tokens.space.xxl },
  eyebrow: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  title: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.display,
    lineHeight: tokens.lineHeight.display,
    fontWeight: tokens.weight.heavy
  },
  body: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  },
  codeCard: {
    marginVertical: tokens.space.lg,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg
  },
  codeLabel: { fontSize: tokens.type.caption, fontWeight: tokens.weight.medium },
  code: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold,
    letterSpacing: 1.5
  }
});
