import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { ChoiceRow } from '@/components/ui/choice-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function AgeAndSafetyScreen() {
  const { attestAgeAndSafety } = useAuth();
  const { theme } = useTheme();
  const [adult, setAdult] = useState(false);
  const [safety, setSafety] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!adult || !safety) return;
    setLoading(true);
    const result = await attestAgeAndSafety();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/onboarding');
  };

  return (
    <AppScreen
      eyebrow="Safety gate"
      title="Before the fun starts"
      subtitle="Campus Clash is for adults meeting in groups at public venues. We never track your live or background location."
    >
      <View style={[styles.hero, { backgroundColor: theme.surfaceMuted }]}>
        <Text style={styles.heroIcon}>🛡️</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Group-first by design
        </Text>
        <Text style={[styles.heroCopy, { color: theme.textMuted }]}>
          No dating, direct messages, one-to-one matching, or private meeting locations.
        </Text>
      </View>
      <ChoiceRow
        selected={adult}
        onPress={() => setAdult((value) => !value)}
        label="I confirm I am at least 18"
        detail="This is an attestation, not an automated age or identity verification."
      />
      <ChoiceRow
        selected={safety}
        onPress={() => setSafety((value) => !value)}
        label="I agree to the community safety rules"
        detail="Respect boundaries, meet only at the revealed public venue, and report concerns."
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, marginBottom: 12 }}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        label="Agree and continue"
        disabled={!adult || !safety}
        loading={loading}
        onPress={() => void submit()}
      />
      <Text style={[styles.emergency, { color: theme.textMuted }]}>
        Campus Clash is not an emergency service. In immediate danger, contact local
        emergency services.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    marginBottom: tokens.space.lg
  },
  heroIcon: { fontSize: 48 },
  heroTitle: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.heading,
    fontWeight: '900'
  },
  heroCopy: { marginTop: 6, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emergency: {
    marginTop: tokens.space.md,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center'
  }
});
