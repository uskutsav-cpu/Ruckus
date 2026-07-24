import { useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { onboardingSchema } from '@/features/auth/auth-schema';
import { uploadAvatar } from '@/features/profile/profile-service';
import { useProfileDashboard } from '@/features/profile/use-profile';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function EditProfileScreen() {
  const { completeOnboarding, interests, isDemo, profile, refreshProfile, user } =
    useAuth();
  const dashboard = useProfileDashboard();
  const { theme } = useTheme();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [graduationYear, setGraduationYear] = useState(
    String(profile?.graduation_year ?? '')
  );
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [selected, setSelected] = useState<string[] | null>(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedIds = selected ?? dashboard.data?.selectedInterestIds ?? [];

  const toggleInterest = (interestId: string) => {
    setSelected(
      selectedIds.includes(interestId)
        ? selectedIds.filter((value) => value !== interestId)
        : selectedIds.length < 5
          ? [...selectedIds, interestId]
          : selectedIds
    );
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (!result.canceled) setPhoto(result.assets[0] ?? null);
  };

  const save = async () => {
    if (!user) return;
    const parsed = onboardingSchema.safeParse({
      displayName,
      graduationYear,
      bio,
      interestIds: selectedIds
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your profile details.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await completeOnboarding(parsed.data);
    if (result.error) {
      setSaving(false);
      setError(result.error);
      return;
    }
    try {
      if (photo && !isDemo) {
        await uploadAvatar({
          userId: user.id,
          uri: photo.uri,
          mimeType: photo.mimeType ?? 'image/jpeg'
        });
      }
      await refreshProfile();
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen
      eyebrow="Player card"
      title="Edit profile"
      subtitle="Your display name, photo, bio, year, and interests appear only in the group contexts that require them."
      footer={
        <View style={styles.footer}>
          <PrimaryButton
            label="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.footerButton}
          />
          <PrimaryButton
            label="Save profile"
            loading={saving}
            onPress={() => void save()}
            style={styles.footerButton}
          />
        </View>
      }
    >
      <PrimaryButton
        label={photo ? 'Photo selected ✓' : 'Choose optional photo'}
        variant="secondary"
        onPress={() => void pickPhoto()}
      />
      <Text style={[styles.photoHelp, { color: theme.textMuted }]}>
        Square JPG or PNG, up to 5 MB. Stored in your private campus avatar folder.
      </Text>
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
      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={280}
        help={`${bio.length}/280`}
        style={styles.bio}
      />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Interests · choose 3–5
      </Text>
      <View style={styles.chips}>
        {interests.map((interest) => {
          const active = selectedIds.includes(interest.id);
          return (
            <Pressable
              key={interest.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              onPress={() => toggleInterest(interest.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.surface,
                  borderColor: active ? theme.primary : theme.border
                }
              ]}
            >
              <Text style={styles.chipEmoji}>{interest.emoji}</Text>
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.text }]}>
                {interest.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  photoHelp: { marginTop: 7, marginBottom: tokens.space.md, fontSize: 11 },
  bio: { minHeight: 120, paddingTop: tokens.space.md, textAlignVertical: 'top' },
  sectionTitle: { marginTop: tokens.space.lg, fontSize: 17, fontWeight: '900' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginTop: tokens.space.md
  },
  chip: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 13
  },
  chipEmoji: { marginRight: 6, fontSize: 18 },
  chipText: { fontSize: 13, fontWeight: '800' },
  error: { marginTop: tokens.space.md, fontSize: 13, lineHeight: 19 },
  footer: { flexDirection: 'row', gap: tokens.space.sm },
  footerButton: { flex: 1 }
});
