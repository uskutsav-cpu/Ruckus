import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { ChoiceRow } from '@/components/ui/choice-row';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { EventCard } from '@/features/events/event-card';
import { eventErrorMessage } from '@/features/events/event-service';
import type { CreateEventInput, EventSummary } from '@/features/events/event-types';
import { useCreateEvent } from '@/features/events/use-events';
import { useMyOrganizations } from '@/features/organizations/use-organizations';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

function localInputDate(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function CreateEventScreen() {
  const { organizationId: organizationIdParam } = useLocalSearchParams<{
    organizationId?: string;
  }>();
  const { isDemo, profile } = useAuth();
  const { theme } = useTheme();
  const create = useCreateEvent();
  const [minimumStartTime] = useState(() => Date.now());
  const organizations = useMyOrganizations();
  const selectedOrganization = organizations.data?.find(
    (organization) =>
      organization.id === organizationIdParam &&
      organization.membershipStatus === 'active'
  );
  const [step, setStep] = useState<'edit' | 'preview' | 'success'>('edit');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Social');
  const [startsAt, setStartsAt] = useState(localInputDate(3, 18));
  const [endsAt, setEndsAt] = useState(localInputDate(3, 20));
  const [venueName, setVenueName] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [capacity, setCapacity] = useState('30');
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [visibility, setVisibility] = useState<'campus' | 'public' | 'private'>('campus');
  const [accessibilityInformation, setAccessibilityInformation] = useState('');
  const [costInformation, setCostInformation] = useState('Free');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [safetyRules, setSafetyRules] = useState(
    'Respect the community guidelines and follow host instructions.'
  );
  const [error, setError] = useState<string | null>(null);

  const input = useMemo<CreateEventInput | null>(() => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const count = Number(capacity);
    if (
      title.trim().length < 3 ||
      description.trim().length < 10 ||
      category.trim().length < 2 ||
      venueName.trim().length < 2 ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start.getTime() <= minimumStartTime ||
      end <= start ||
      !Number.isInteger(count) ||
      count < 1
    ) {
      return null;
    }
    return {
      ...(selectedOrganization ? { organizationId: selectedOrganization.id } : {}),
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
      venueName: venueName.trim(),
      locationDescription: locationDescription.trim(),
      capacity: count,
      waitlistEnabled,
      approvalRequired,
      visibility,
      accessibilityInformation,
      costInformation,
      cancellationPolicy,
      safetyRules
    };
  }, [
    accessibilityInformation,
    approvalRequired,
    cancellationPolicy,
    capacity,
    category,
    costInformation,
    description,
    endsAt,
    locationDescription,
    minimumStartTime,
    safetyRules,
    selectedOrganization,
    startsAt,
    title,
    venueName,
    visibility,
    waitlistEnabled
  ]);

  const preview: EventSummary | null = input
    ? {
        id: 'preview',
        slug: 'preview',
        title: input.title,
        description: input.description,
        category: input.category,
        coverImagePath: null,
        campusId: profile?.campus_id ?? '',
        campusName: 'Your campus',
        organizationId: selectedOrganization?.id ?? null,
        organizationName:
          selectedOrganization?.name ?? profile?.display_name ?? 'Campus host',
        organizationVerified: selectedOrganization?.isVerified ?? false,
        organizationFollowed: false,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timezone: input.timezone,
        venueName: input.venueName,
        locationDescription: input.locationDescription,
        capacity: input.capacity,
        confirmedCount: 0,
        availability: 'available',
        waitlistEnabled: input.waitlistEnabled,
        approvalRequired: input.approvalRequired,
        visibility: input.visibility,
        accessibilityInformation: input.accessibilityInformation || null,
        costInformation: input.costInformation || null,
        cancellationPolicy: input.cancellationPolicy || null,
        friendsAttendingCount: 0,
        recommendationReasons: ['New on Ruckus']
      }
    : null;

  const submit = (publishEvent: boolean) => {
    if (!input) return;
    setError(null);
    create.mutate(
      { ...input, publish: publishEvent },
      {
        onSuccess: (eventId) => {
          if (isDemo) setStep('success');
          else router.replace({ pathname: '/event/[id]', params: { id: eventId } });
        },
        onError: (nextError) => setError(eventErrorMessage(nextError))
      }
    );
  };

  if (step === 'success') {
    return (
      <AppScreen>
        <ScreenHeader eyebrow="Demo preview" title="Event ready" />
        <InlineNotice
          tone="success"
          icon="✓"
          message="Your event passed the preview flow. Demo mode does not publish to a shared backend."
        />
        <PrimaryButton label="Create another" onPress={() => setStep('edit')} />
        <SecondaryButton
          label="Back to Discover"
          onPress={() => router.replace('/discover')}
        />
      </AppScreen>
    );
  }

  if (step === 'preview' && preview) {
    return (
      <AppScreen>
        <ScreenHeader
          eyebrow="Review before publishing"
          title="Event preview"
          subtitle="This is how the event enters discovery. Counts begin at zero; no attendance is fabricated."
        />
        <EventCard event={preview} onPress={() => undefined} />
        <View style={[styles.review, { borderColor: theme.border }]}>
          <Text style={[styles.reviewTitle, { color: theme.text }]}>Publish checks</Text>
          <ChoiceRow
            selected
            label="18+ launch policy"
            detail="Required for the initial beta."
            onPress={() => undefined}
          />
          <ChoiceRow
            selected
            label="Community rules included"
            detail={safetyRules}
            onPress={() => undefined}
          />
          <ChoiceRow
            selected={Boolean(accessibilityInformation.trim())}
            label="Accessibility details"
            detail={
              accessibilityInformation.trim()
                ? accessibilityInformation
                : 'Not provided — go back if attendees need more detail.'
            }
            onPress={() => setStep('edit')}
          />
        </View>
        {error ? <InlineNotice tone="error" icon="!" message={error} /> : null}
        <PrimaryButton
          label="Publish event"
          leadingIcon="send"
          loading={create.isPending}
          onPress={() => submit(true)}
        />
        <SecondaryButton label="Save as draft" onPress={() => submit(false)} />
        <SecondaryButton label="Back to edit" onPress={() => setStep('edit')} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Organizer studio"
        title="Create"
        subtitle="Authorized club managers and trusted hosts can publish. All events remain subject to moderation."
      />
      <InlineNotice
        tone="info"
        icon="organization"
        message={
          selectedOrganization
            ? `Publishing for ${selectedOrganization.name}. The profile’s verification status will be shown truthfully.`
            : 'Publishing as an individual host. Create or join an organization from Profile to publish on its behalf.'
        }
      />
      <TextField
        label="Event title"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={5000}
        style={styles.multiline}
        help="Explain what happens, who it is for, and what attendees should bring."
      />
      <TextField
        label="Category"
        value={category}
        onChangeText={setCategory}
        maxLength={60}
      />
      <TextField
        label="Starts"
        value={startsAt}
        onChangeText={setStartsAt}
        autoCapitalize="none"
        help="Local time, for example 2026-08-05T18:00"
      />
      <TextField
        label="Ends"
        value={endsAt}
        onChangeText={setEndsAt}
        autoCapitalize="none"
      />
      <TextField
        label="Venue name"
        value={venueName}
        onChangeText={setVenueName}
        maxLength={200}
      />
      <TextField
        label="Location description"
        value={locationDescription}
        onChangeText={setLocationDescription}
        maxLength={1000}
        help="Avoid private or sensitive location details before confirmation."
      />
      <TextField
        label="Capacity"
        value={capacity}
        onChangeText={setCapacity}
        keyboardType="number-pad"
      />
      <SegmentedControl
        accessibilityLabel="Event visibility"
        value={visibility}
        options={[
          { value: 'campus', label: 'Campus' },
          { value: 'public', label: 'Public' },
          { value: 'private', label: 'Private' }
        ]}
        onChange={setVisibility}
      />
      <View style={styles.switches}>
        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View style={styles.switchCopy}>
            <Text style={[styles.switchTitle, { color: theme.text }]}>Waitlist</Text>
            <Text style={[styles.switchText, { color: theme.textMuted }]}>
              Promote in order when a spot opens.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Enable waitlist"
            value={waitlistEnabled}
            onValueChange={setWaitlistEnabled}
          />
        </View>
        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <View style={styles.switchCopy}>
            <Text style={[styles.switchTitle, { color: theme.text }]}>
              Approval required
            </Text>
            <Text style={[styles.switchText, { color: theme.textMuted }]}>
              Review each request before confirmation.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Require RSVP approval"
            value={approvalRequired}
            onValueChange={setApprovalRequired}
          />
        </View>
      </View>
      <TextField
        label="Accessibility information"
        value={accessibilityInformation}
        onChangeText={setAccessibilityInformation}
        maxLength={2000}
        multiline
        style={styles.multilineSmall}
      />
      <TextField
        label="Cost information"
        value={costInformation}
        onChangeText={setCostInformation}
        maxLength={500}
        help="Ruckus does not process payment in this beta."
      />
      <TextField
        label="Cancellation policy"
        value={cancellationPolicy}
        onChangeText={setCancellationPolicy}
        maxLength={2000}
        multiline
        style={styles.multilineSmall}
      />
      <TextField
        label="Community and safety rules"
        value={safetyRules}
        onChangeText={setSafetyRules}
        maxLength={2000}
        multiline
        style={styles.multilineSmall}
      />
      <PrimaryButton
        label="Review event"
        leadingIcon="forward"
        disabled={!input}
        onPress={() => setStep('preview')}
      />
      {!input ? (
        <Text
          accessibilityRole="alert"
          style={[styles.validation, { color: theme.warning }]}
        >
          Add a future start time, later end time, venue, capacity, title, and description
          to continue.
        </Text>
      ) : (
        <Text style={[styles.validation, { color: theme.textMuted }]}>
          Starts {format(new Date(input.startsAt), 'EEE, MMM d at p')} · {input.capacity}{' '}
          spots
        </Text>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  multiline: { minHeight: 120, paddingTop: tokens.space.md, textAlignVertical: 'top' },
  multilineSmall: {
    minHeight: 86,
    paddingTop: tokens.space.md,
    textAlignVertical: 'top'
  },
  switches: { marginVertical: tokens.space.md, gap: tokens.space.sm },
  switchRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  switchCopy: { flex: 1, gap: tokens.space.xs },
  switchTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  switchText: { fontSize: tokens.type.caption, lineHeight: tokens.lineHeight.caption },
  validation: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  review: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: tokens.space.lg },
  reviewTitle: {
    marginBottom: tokens.space.md,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold
  }
});
