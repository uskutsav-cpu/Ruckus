import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const { resendVerification } = useAuth();
  const { theme } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    setLoading(true);
    const result = await resendVerification(email);
    setLoading(false);
    setMessage(result.error ?? 'Fresh link sent. Check your inbox.');
  };

  return (
    <AuthScaffold
      eyebrow="One quick check"
      title="Open your campus inbox."
      subtitle={`We sent a secure link to ${email || 'your university email'}. Open it on this device to continue.`}
    >
      <View style={[styles.mail, { backgroundColor: theme.accentMuted }]}>
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceElevated }]}>
          <Text style={styles.icon}>↗</Text>
        </View>
        <View style={styles.mailCopy}>
          <Text style={[styles.mailTitle, { color: theme.text }]}>
            Your Ruckus link is ready
          </Text>
          <Text style={[styles.copy, { color: theme.textMuted }]}>
            Email verification confirms access to that university inbox. It is not
            identity verification.
          </Text>
        </View>
      </View>
      {message ? <InlineNotice icon="✓" message={message} /> : null}
      <PrimaryButton
        label="Resend verification"
        loading={loading}
        onPress={() => void resend()}
      />
      <PrimaryButton
        label="I’ve verified — sign in"
        onPress={() => router.replace('/sign-in')}
        variant="ghost"
        style={styles.signInButton}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  mail: {
    flexDirection: 'row',
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginBottom: tokens.space.lg
  },
  iconWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  icon: {
    fontSize: 22,
    fontWeight: tokens.weight.black,
    transform: [{ rotate: '-14deg' }]
  },
  mailCopy: { flex: 1, marginLeft: tokens.space.md },
  mailTitle: { fontSize: 15, fontWeight: tokens.weight.black },
  copy: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  signInButton: { marginTop: tokens.space.sm }
});
