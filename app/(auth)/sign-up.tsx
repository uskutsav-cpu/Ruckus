import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { signUpSchema } from '@/features/auth/auth-schema';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const { theme } = useTheme();
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
    <AppScreen
      eyebrow="Step into the game"
      title="Create your campus account"
      subtitle={`Use your @${env.universityEmailDomain} address. This verifies access to the university email domain—not your identity.`}
    >
      <TextField
        label="First name or display name"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        autoComplete="name"
      />
      <TextField
        label="University email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder={`you@${env.universityEmailDomain}`}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        help="10+ characters with uppercase, lowercase, and a number."
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, marginBottom: 12 }}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        label="Create account"
        loading={loading}
        onPress={() => void submit()}
      />
      <PrimaryButton
        label="Back"
        onPress={() => router.back()}
        variant="ghost"
        style={{ marginTop: 8 }}
      />
    </AppScreen>
  );
}
