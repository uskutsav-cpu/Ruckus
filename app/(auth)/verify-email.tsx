import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
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
    <AppScreen
      eyebrow="One quick check"
      title="Verify your campus email"
      subtitle={`We sent a link to ${email || 'your university inbox'}. Open it on this device to continue.`}
    >
      <View style={[styles.mail, { backgroundColor: theme.surfaceMuted }]}>
        <Text style={styles.icon}>📬</Text>
        <Text style={[styles.copy, { color: theme.text }]}>
          Email-domain verification confirms access to that inbox. It is not proof of
          identity.
        </Text>
      </View>
      {message ? (
        <Text
          accessibilityRole="alert"
          style={[styles.message, { color: theme.textMuted }]}
        >
          {message}
        </Text>
      ) : null}
      <PrimaryButton
        label="Resend verification"
        loading={loading}
        onPress={() => void resend()}
      />
      <PrimaryButton
        label="I’ve verified—sign in"
        onPress={() => router.replace('/sign-in')}
        variant="ghost"
        style={{ marginTop: 8 }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  mail: {
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    marginBottom: tokens.space.lg
  },
  icon: { fontSize: 54 },
  copy: {
    marginTop: tokens.space.md,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center'
  },
  message: { marginBottom: tokens.space.md, textAlign: 'center' }
});
