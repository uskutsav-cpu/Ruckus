import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ChoiceRow } from '@/components/ui/choice-row';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import type { SocialPreferences } from '@/features/social/social-types';
import {
  useSocialOverview,
  useUpdateSocialPreferences
} from '@/features/social/use-social';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function SocialPrivacyScreen() {
  const { theme } = useTheme();
  const overview = useSocialOverview();
  const update = useUpdateSocialPreferences();
  const [draftOverride, setDraft] = useState<SocialPreferences | null>(null);
  const [saved, setSaved] = useState(false);
  const draft = draftOverride ?? overview.data?.preferences ?? null;

  if (overview.isError) {
    return (
      <AppScreen>
        <BackButton label="Connections" />
        <ErrorState
          title="Social privacy unavailable"
          message="Your existing choices remain active. Try again."
          actionLabel="Try again"
          onAction={() => void overview.refetch()}
        />
      </AppScreen>
    );
  }
  if (overview.isLoading || !draft) {
    return (
      <AppScreen>
        <BackButton label="Connections" />
        <ListCardSkeleton count={3} />
      </AppScreen>
    );
  }
  return (
    <AppScreen
      eyebrow="Connection controls"
      title="Social privacy"
      subtitle="Conservative defaults keep your profile and attendance limited until you choose otherwise."
    >
      <BackButton label="Connections" onPress={() => router.back()} />
      {saved ? (
        <InlineNotice tone="success" message="Social privacy choices saved." />
      ) : null}
      {update.isError ? (
        <InlineNotice tone="error" message="Your choices were not saved. Try again." />
      ) : null}

      <Section title="Who can view your profile">
        <ChoiceRow
          selected={draft.profileVisibility === 'campus'}
          label="Verified campus members"
          detail="Members at your verified campus can view your bio."
          icon="organization"
          onPress={() => setDraft({ ...draft, profileVisibility: 'campus' })}
        />
        <ChoiceRow
          selected={draft.profileVisibility === 'friends'}
          label="Friends only"
          detail="Recommended default. Suggestions show only limited profile fields."
          icon="people"
          onPress={() => setDraft({ ...draft, profileVisibility: 'friends' })}
        />
        <ChoiceRow
          selected={draft.profileVisibility === 'private'}
          label="Private"
          detail="Only you can open your social profile."
          icon="lock"
          onPress={() => setDraft({ ...draft, profileVisibility: 'private' })}
        />
      </Section>

      <Section title="Event attendance">
        <ChoiceRow
          selected={draft.attendanceVisibility === 'friends'}
          label="Friends"
          detail="Only friends may see you on a visible attendee list."
          icon="people"
          onPress={() => setDraft({ ...draft, attendanceVisibility: 'friends' })}
        />
        <ChoiceRow
          selected={draft.attendanceVisibility === 'confirmed_attendees'}
          label="Confirmed attendees"
          detail="Other confirmed attendees may see you when the host enables the list."
          icon="check"
          onPress={() =>
            setDraft({ ...draft, attendanceVisibility: 'confirmed_attendees' })
          }
        />
        <ChoiceRow
          selected={draft.attendanceVisibility === 'private'}
          label="Private"
          detail="Never include you in the social attendee preview."
          icon="lock"
          onPress={() => setDraft({ ...draft, attendanceVisibility: 'private' })}
        />
      </Section>

      <Section title="Connection requests">
        <ChoiceRow
          selected={draft.followPolicy === 'public'}
          label="Open follows"
          detail="Verified campus members may follow immediately."
          onPress={() => setDraft({ ...draft, followPolicy: 'public' })}
        />
        <ChoiceRow
          selected={draft.followPolicy === 'approval'}
          label="Approve follows"
          detail="Recommended default. Every new follower needs your approval."
          onPress={() => setDraft({ ...draft, followPolicy: 'approval' })}
        />
        <ChoiceRow
          selected={draft.followPolicy === 'disabled'}
          label="Disable follows"
          detail="Do not accept new follow relationships."
          onPress={() => setDraft({ ...draft, followPolicy: 'disabled' })}
        />
        <ToggleRow
          title="Allow friend requests"
          description="Friends are mutual and require acceptance."
          value={draft.allowFriendRequests}
          onChange={(value) => setDraft({ ...draft, allowFriendRequests: value })}
        />
        <ToggleRow
          title="Appear in suggestions"
          description="Off by default. Uses only same-campus, privacy-safe relationship signals."
          value={draft.showInSuggestions}
          onChange={(value) => setDraft({ ...draft, showInSuggestions: value })}
        />
      </Section>

      <PrimaryButton
        label="Save social privacy"
        leadingIcon="check"
        loading={update.isPending}
        onPress={() =>
          update.mutate(draft, {
            onSuccess: (preferences) => {
              setDraft(preferences);
              setSaved(true);
            }
          })
        }
      />
      <Text style={[styles.note, { color: theme.textMuted }]}>
        Blocking always overrides these choices and removes existing social links.
      </Text>
    </AppScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.toggle, { borderColor: theme.border }]}>
      <View style={styles.flex}>
        <Text style={[styles.toggleTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.toggleBody, { color: theme.textMuted }]}>{description}</Text>
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: tokens.space.xl },
  sectionTitle: {
    marginBottom: tokens.space.md,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: tokens.space.md
  },
  toggleTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  toggleBody: {
    marginTop: 4,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  flex: { flex: 1 },
  note: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    textAlign: 'center'
  }
});
