import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { signUpSchema } from '@/features/auth/auth-schema';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';
import { tokens } from '@/theme/tokens';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const parsed = signUpSchema.safeParse({ displayName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signUp(parsed.data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace({ pathname: '/verify-email', params: { email: parsed.data.email } });
  };

  return (
    <AuthScaffold
      eyebrow="Create account"
      title="Join your campus."
      subtitle={`Use your @${env.universityEmailDomain} email. This confirms access to your university inbox.`}
    >
      <TextField
        label="First name or nickname"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        placeholder="First name or nickname"
      />
      <TextField
        label="University email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        placeholder={`you@${env.universityEmailDomain}`}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        help="10+ characters with uppercase, lowercase, and a number."
      />
      {error ? <InlineNotice tone="error" icon="!" message={error} /> : null}
      <PrimaryButton
        label="Create account"
        loading={loading}
        onPress={() => void submit()}
      />
      <PrimaryButton
        label="Back"
        onPress={() => router.back()}
        variant="ghost"
        style={styles.backButton}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  backButton: { marginTop: tokens.space.sm }
});
