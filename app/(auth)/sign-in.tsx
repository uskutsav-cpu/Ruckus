import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { signInSchema } from '@/features/auth/auth-schema';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const { theme } = useTheme();
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
    const result = await signIn(parsed.data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/');
  };

  return (
    <AppScreen
      eyebrow="Welcome back"
      title="Ready for round two?"
      subtitle="Sign in with your verified university email."
    >
      <TextField
        label="University email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, marginBottom: 12 }}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton label="Sign in" loading={loading} onPress={() => void submit()} />
      <PrimaryButton
        label="Create a new account"
        onPress={() => router.replace('/sign-up')}
        variant="ghost"
        style={{ marginTop: 8 }}
      />
    </AppScreen>
  );
}
