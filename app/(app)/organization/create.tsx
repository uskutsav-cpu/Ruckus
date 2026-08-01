import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { useCreateOrganization } from '@/features/organizations/use-organizations';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function CreateOrganizationScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const create = useCreateOrganization();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2 || description.trim().length < 20) {
      setError('Add a name and a description of at least 20 characters.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) {
      setError('Enter a valid organization contact email.');
      return;
    }
    if (websiteUrl.trim()) {
      try {
        const parsed = new URL(websiteUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        setError('Website must be a complete http or https URL.');
        return;
      }
    }
    try {
      const id = await create.mutateAsync({
        name,
        description,
        contactEmail,
        websiteUrl
      });
      router.replace(`/organization/${id}`);
    } catch {
      setError('The organization was not created. Check the details and try again.');
    }
  };

  return (
    <AppScreen
      eyebrow="Organizer onboarding · Step 1"
      title="Create an organization"
      subtitle="Start an unverified campus profile. Verification and officer invitations come next."
    >
      <BackButton label="Organizations" onPress={() => router.back()} />
      <InlineNotice message="Only create profiles you are authorized to represent. Ruckus does not claim university endorsement." />
      <TextField
        label="Organization name"
        value={name}
        onChangeText={setName}
        maxLength={120}
        autoCapitalize="words"
      />
      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        multiline
        style={styles.multiline}
        help="Explain the club’s purpose and who it serves."
      />
      <TextField
        label="Private contact email"
        value={contactEmail}
        onChangeText={setContactEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        help="Visible only to authorized organization managers and Ruckus reviewers."
      />
      <TextField
        label="Public website (optional)"
        value={websiteUrl}
        onChangeText={setWebsiteUrl}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <InlineNotice tone="error" message={error} /> : null}
      <Text style={[styles.terms, { color: theme.textMuted }]}>
        By creating this profile, you confirm you are 18+ and will follow the Terms and
        Community Guidelines. Verification is a separate review.
      </Text>
      <PrimaryButton
        label="Create profile"
        leadingIcon="organization"
        loading={create.isPending}
        onPress={() => void submit()}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  multiline: { minHeight: 116, paddingTop: tokens.space.md, textAlignVertical: 'top' },
  terms: {
    marginBottom: tokens.space.md,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  }
});
