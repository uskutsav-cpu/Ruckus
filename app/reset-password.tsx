import { useState } from 'react';
import { router } from 'expo-router';

import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { useAuth } from '@/providers/auth-provider';

export default function ResetPasswordScreen() {
  const { isPasswordRecovery, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Use at least 10 characters with an uppercase letter and a number.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/sign-in');
  };

  if (!isPasswordRecovery) {
    return (
      <AuthScaffold
        eyebrow="Recovery link required"
        title="Start from your email."
        subtitle="Password changes require a current recovery session."
      >
        <InlineNotice message="Open the latest password-recovery link, or request a new one." />
        <PrimaryButton
          label="Request a recovery link"
          onPress={() => router.replace('/forgot-password')}
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      eyebrow="Secure recovery"
      title="Choose a new password."
      subtitle="After saving, Ruckus signs out this recovery session so you can sign in normally."
    >
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <TextField
        label="Confirm new password"
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        autoComplete="new-password"
      />
      {error ? <InlineNotice tone="error" message={error} /> : null}
      <PrimaryButton
        label="Update password"
        loading={loading}
        onPress={() => void submit()}
      />
    </AuthScaffold>
  );
}
