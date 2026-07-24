import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChoiceRow } from '@/components/ui/choice-row';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
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
    setError(null);
    const result = await attestAgeAndSafety();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/onboarding');
  };

  return (
    <AuthScaffold
      eyebrow="Play it social. Keep it safe."
      title="A few ground rules."
      subtitle="Ruckus is built for adults meeting in groups at approved public venues—never one-to-one or at a live location."
      progress={{ current: 1, total: 4, label: 'Player setup' }}
    >
      <View style={[styles.safetyCard, { backgroundColor: theme.surfaceMuted }]}>
        <View style={styles.safetyTop}>
          <View style={[styles.shield, { backgroundColor: theme.primary }]}>
            <Text style={[styles.shieldText, { color: theme.onPrimary }]}>✓</Text>
          </View>
          <StatusPill label="GROUP-FIRST" tone="accent" />
        </View>
        <Text style={[styles.safetyTitle, { color: theme.text }]}>
          Designed for public plans
        </Text>
        <View style={styles.rules}>
          <Text style={[styles.rule, { color: theme.textMuted }]}>
            • No dating, DMs, or one-to-one matching
          </Text>
          <Text style={[styles.rule, { color: theme.textMuted }]}>
            • No background or exact live location
          </Text>
          <Text style={[styles.rule, { color: theme.textMuted }]}>
            • The venue unlocks only after the group confirms
          </Text>
        </View>
      </View>
      <ChoiceRow
        selected={adult}
        onPress={() => setAdult((value) => !value)}
        icon="18"
        label="I confirm I am at least 18"
        detail="This is an attestation, not automated age or identity verification."
      />
      <ChoiceRow
        selected={safety}
        onPress={() => setSafety((value) => !value)}
        icon="◎"
        label="I agree to the community rules"
        detail="Respect boundaries, meet at the revealed public venue, and report concerns."
      />
      {error ? <InlineNotice tone="error" icon="!" message={error} /> : null}
      <PrimaryButton
        label="Agree and keep going"
        disabled={!adult || !safety}
        loading={loading}
        onPress={() => void submit()}
      />
      <Text style={[styles.emergency, { color: theme.textSubtle }]}>
        Ruckus is not an emergency service. In immediate danger, contact local emergency
        services.
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  safetyCard: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginBottom: tokens.space.lg
  },
  safetyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  shield: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
    transform: [{ rotate: '-5deg' }]
  },
  shieldText: { fontSize: 22, fontWeight: tokens.weight.black },
  safetyTitle: {
    marginTop: tokens.space.md,
    fontSize: 19,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.35
  },
  rules: { marginTop: tokens.space.sm, gap: 5 },
  rule: {
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  emergency: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.micro,
    lineHeight: 16,
    textAlign: 'center'
  }
});
