import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { onboardingSchema } from '@/features/auth/auth-schema';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function OnboardingScreen() {
  const { completeOnboarding, interests, profile } = useAuth();
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [graduationYear, setGraduationYear] = useState(
    String(profile?.graduation_year ?? new Date().getFullYear() + 2)
  );
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const progress = useMemo(() => `${step + 1} / 3`, [step]);

  if (!profile?.age_attested || !profile.safety_acknowledged_at) {
    return <Redirect href="/age-and-safety" />;
  }

  const next = () => {
    if (step === 0 && (displayName.trim().length < 2 || !graduationYear)) {
      setError('Add a display name and graduation year.');
      return;
    }
    setError(null);
    setStep((value) => Math.min(2, value + 1));
  };

  const toggleInterest = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < 5
          ? [...current, id]
          : current
    );
  };

  const submit = async () => {
    const parsed = onboardingSchema.safeParse({
      displayName,
      graduationYear,
      bio,
      interestIds: selected
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your choices.');
      return;
    }
    setLoading(true);
    const result = await completeOnboarding(parsed.data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/');
  };

  return (
    <AppScreen
      eyebrow={`Build your player card · ${progress}`}
      title={
        step === 0
          ? 'What should your crew call you?'
          : step === 1
            ? 'Add a little flavor'
            : 'Choose your campus energy'
      }
      subtitle={
        step === 0
          ? 'Use a first name or nickname you are comfortable sharing in groups.'
          : step === 1
            ? 'Keep it light—this appears only where a public profile is needed.'
            : 'Pick three to five. These help organize activities; there are no AI recommendations.'
      }
      footer={
        <View style={styles.footer}>
          {step > 0 ? (
            <PrimaryButton
              label="Back"
              onPress={() => setStep((value) => value - 1)}
              variant="secondary"
              style={styles.footerButton}
            />
          ) : null}
          <PrimaryButton
            label={step === 2 ? 'Finish setup' : 'Continue'}
            onPress={() => (step === 2 ? void submit() : next())}
            loading={loading}
            disabled={step === 2 && selected.length < 3}
            style={styles.footerButton}
          />
        </View>
      }
    >
      {step === 0 ? (
        <>
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            maxLength={40}
          />
          <TextField
            label="Graduation year"
            value={graduationYear}
            onChangeText={setGraduationYear}
            keyboardType="number-pad"
            maxLength={4}
          />
        </>
      ) : null}
      {step === 1 ? (
        <TextField
          label="Bio (optional)"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={280}
          style={styles.bio}
          help={`${bio.length}/280`}
          placeholder="Night owl, taco critic, undefeated at trivia…"
        />
      ) : null}
      {step === 2 ? (
        <View style={styles.chips}>
          {interests.map((interest) => {
            const isSelected = selected.includes(interest.id);
            return (
              <Pressable
                key={interest.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggleInterest(interest.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border
                  }
                ]}
              >
                <Text style={styles.chipEmoji}>{interest.emoji}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: isSelected ? '#FFFFFF' : theme.text }
                  ]}
                >
                  {interest.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, marginTop: 12 }}>
          {error}
        </Text>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bio: { minHeight: 150, paddingTop: tokens.space.md, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  chip: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.md
  },
  chipEmoji: { marginRight: 7, fontSize: 20 },
  chipLabel: { fontSize: 15, fontWeight: '800' },
  footer: { flexDirection: 'row', gap: tokens.space.sm },
  footerButton: { flex: 1 }
});
