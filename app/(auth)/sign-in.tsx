import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { signInSchema } from '@/features/auth/auth-schema';
import { useAuth } from '@/providers/auth-provider';
import { tokens } from '@/theme/tokens';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signIn(parsed.data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/');
  };

  return (
    <AuthScaffold
      eyebrow="Welcome back"
      title="The campus is waiting."
      subtitle="Use your verified university email to jump back into tonight’s plans."
    >
      <TextField
        label="University email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        placeholder="you@university.edu"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      {error ? <InlineNotice tone="error" icon="!" message={error} /> : null}
      <PrimaryButton
        label="Sign in to Ruckus"
        loading={loading}
        onPress={() => void submit()}
      />
      <PrimaryButton
        label="Create a new account"
        onPress={() => router.replace('/sign-up')}
        variant="ghost"
        style={styles.switchButton}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  switchButton: { marginTop: tokens.space.sm }
});
