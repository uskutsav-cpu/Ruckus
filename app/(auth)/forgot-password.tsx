import { useState } from 'react';
import { router } from 'expo-router';

import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { useAuth } from '@/providers/auth-provider';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string } | null>(
    null
  );

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setNotice({ tone: 'error', text: 'Enter a valid university email.' });
      return;
    }
    setLoading(true);
    const result = await requestPasswordReset(email.trim().toLowerCase());
    setLoading(false);
    if (result.error) {
      setNotice({ tone: 'error', text: result.error });
      return;
    }
    setNotice({
      tone: 'info',
      text: 'If an eligible account exists, a recovery link is on its way. Check spam and wait before retrying.'
    });
  };

  return (
    <AuthScaffold
      eyebrow="Account recovery"
      title="Reset your password."
      subtitle="We’ll send a single-use recovery link without revealing whether an account exists."
    >
      <TextField
        label="University email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      {notice ? <InlineNotice tone={notice.tone} message={notice.text} /> : null}
      <PrimaryButton
        label="Send recovery link"
        loading={loading}
        onPress={() => void submit()}
      />
      <PrimaryButton
        label="Back to sign in"
        variant="ghost"
        onPress={() => router.back()}
      />
    </AuthScaffold>
  );
}
