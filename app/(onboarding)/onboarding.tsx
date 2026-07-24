import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { onboardingSchema } from '@/features/auth/auth-schema';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const stepCopy = [
  {
    eyebrow: 'Pick your player name',
    title: 'What should your crew call you?',
    subtitle: 'Use a first name or nickname you feel good sharing with activity groups.'
  },
  {
    eyebrow: 'Give the group a vibe check',
    title: 'A little context goes far.',
    subtitle: 'Keep it light. Your bio appears only where a public profile is needed.'
  },
  {
    eyebrow: 'Tune your activity mix',
    title: 'What gets you out the door?',
    subtitle:
      'Pick three to five interests. They organize activities—there are no AI recommendations.'
  }
] as const;

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
    void Haptics.selectionAsync();
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
    setError(null);
    const result = await completeOnboarding(parsed.data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/');
  };

  const copy = stepCopy[step] ?? stepCopy[0];
  const footer = (
    <View style={styles.footer}>
      {step > 0 ? (
        <PrimaryButton
          label="Back"
          onPress={() => setStep((value) => value - 1)}
          variant="secondary"
          style={styles.backButton}
        />
      ) : null}
      <PrimaryButton
        label={step === 2 ? 'Finish my setup' : 'Continue'}
        onPress={() => (step === 2 ? void submit() : next())}
        loading={loading}
        disabled={step === 2 && selected.length < 3}
        style={styles.continueButton}
      />
    </View>
  );

  return (
    <AuthScaffold
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      footer={footer}
      progress={{ current: step + 2, total: 4, label: 'Player setup' }}
    >
      {step === 0 ? (
        <>
          <View style={[styles.preview, { backgroundColor: theme.surfaceMuted }]}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={[styles.avatarText, { color: theme.onPrimary }]}>
                {(displayName.trim()[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={styles.previewCopy}>
              <Text style={[styles.previewName, { color: theme.text }]}>
                {displayName.trim() || 'Your player name'}
              </Text>
              <Text style={[styles.previewMeta, { color: theme.textMuted }]}>
                Class of {graduationYear || '—'} · Verified campus email
              </Text>
            </View>
          </View>
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={40}
            returnKeyType="next"
            placeholder="First name or nickname"
          />
          <TextField
            label="Graduation year"
            value={graduationYear}
            onChangeText={setGraduationYear}
            keyboardType="number-pad"
            maxLength={4}
            returnKeyType="done"
          />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <View style={styles.bioHints}>
            <StatusPill label="KEEP IT SOCIAL" icon="+" />
            <StatusPill label="NO CONTACT INFO" icon="×" tone="warning" />
          </View>
          <TextField
            label="Short bio (optional)"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={280}
            style={styles.bio}
            help={`${bio.length}/280`}
            placeholder="Night owl, taco critic, undefeated at trivia…"
          />
        </>
      ) : null}
      {step === 2 ? (
        <>
          <View style={styles.selectionHeader}>
            <Text style={[styles.selectionLabel, { color: theme.textMuted }]}>
              {selected.length < 3
                ? `${3 - selected.length} more to continue`
                : `${selected.length} selected`}
            </Text>
            <Text style={[styles.selectionLimit, { color: theme.textSubtle }]}>
              Max 5
            </Text>
          </View>
          <View style={styles.chips}>
            {interests.map((interest) => {
              const isSelected = selected.includes(interest.id);
              return (
                <Pressable
                  key={interest.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={interest.name}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => toggleInterest(interest.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surfaceElevated,
                      borderColor: isSelected ? theme.primary : theme.border,
                      opacity: pressed ? 0.75 : 1
                    }
                  ]}
                >
                  <Text style={styles.chipEmoji}>{interest.emoji}</Text>
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: isSelected ? theme.onPrimary : theme.text }
                    ]}
                  >
                    {interest.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      {error ? <InlineNotice tone="error" icon="!" message={error} /> : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginBottom: tokens.space.lg
  },
  avatar: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    transform: [{ rotate: '-4deg' }]
  },
  avatarText: { fontSize: 25, fontWeight: tokens.weight.black },
  previewCopy: { flex: 1, marginLeft: tokens.space.md },
  previewName: {
    fontSize: 17,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.25
  },
  previewMeta: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  bioHints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginBottom: tokens.space.md
  },
  bio: {
    minHeight: 150,
    paddingTop: tokens.space.md,
    textAlignVertical: 'top'
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.space.md
  },
  selectionLabel: { fontSize: tokens.type.label, fontWeight: tokens.weight.heavy },
  selectionLimit: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
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
  chipLabel: { fontSize: 15, fontWeight: tokens.weight.heavy },
  footer: { flexDirection: 'row', gap: tokens.space.sm },
  backButton: { minWidth: 110 },
  continueButton: { flex: 1 }
});
