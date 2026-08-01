import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { CapacityMeter } from '@/components/ui/capacity-meter';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { addEventToDeviceCalendar } from '@/features/events/calendar-service';
import {
  eventErrorMessage,
  summarizeEventForShare
} from '@/features/events/event-service';
import {
  useCancelEventRsvp,
  useEventDetail,
  useJoinEvent
} from '@/features/events/use-events';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

function DetailRow({
  icon,
  label,
  value
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: theme.surfaceMuted }]}>
        <AppIcon name={icon} color={theme.primary} size={19} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const { theme } = useTheme();
  const eventQuery = useEventDetail(eventId ?? '');
  const join = useJoinEvent(eventId ?? '');
  const cancel = useCancelEventRsvp(eventId ?? '');
  const [notice, setNotice] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  if (!eventId || eventQuery.isError) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="calendar"
          title="Event unavailable"
          message="It may have been removed, made private, or become unavailable to your campus."
          actionLabel="Back to Discover"
          onAction={() => router.replace('/discover')}
        />
      </AppScreen>
    );
  }
  if (eventQuery.isLoading || !eventQuery.data) {
    return (
      <AppScreen>
        <BackButton />
        <ListCardSkeleton />
        <ListCardSkeleton />
      </AppScreen>
    );
  }

  const event = eventQuery.data;
  const link = Linking.createURL(`/event/${event.id}`);
  const relationship = event.isHost ? 'hosting' : event.ownRsvp?.status;
  const canCancel =
    relationship === 'confirmed' ||
    relationship === 'pending' ||
    relationship === 'waitlisted';

  const handleJoin = () => {
    setNotice(null);
    join.mutate(undefined, {
      onSuccess: (result) => {
        setNotice(
          result.status === 'confirmed'
            ? "You're confirmed. Event chat is open."
            : result.status === 'pending'
              ? 'Your request is waiting for host approval.'
              : result.status === 'waitlisted'
                ? `Waitlist joined${result.waitlistPosition ? ` at #${result.waitlistPosition}` : ''}.`
                : 'Your event status is up to date.'
        );
      }
    });
  };

  const handleCalendar = async () => {
    try {
      const result = await addEventToDeviceCalendar(event);
      setNotice(
        result === 'opened'
          ? 'Review the prefilled event in your system calendar.'
          : result === 'denied'
            ? 'Calendar permission was not granted. You can enable it in system settings.'
            : 'Adding to a device calendar is available in the iOS or Android development build.'
      );
    } catch {
      setNotice('The system calendar could not be opened on this device.');
    }
  };

  return (
    <AppScreen>
      <BackButton />
      <LinearGradient colors={['#173E35', '#176B5B']} style={styles.hero}>
        <View style={styles.heroTop}>
          <StatusPill label={event.category} tone="dark" />
          <StatusPill label={event.status} tone="dark" />
        </View>
        <View>
          <Text style={styles.heroDate}>
            {format(new Date(event.startsAt), 'EEEE, MMMM d · p')}
          </Text>
          <Text style={styles.heroTitle}>{event.title}</Text>
        </View>
      </LinearGradient>

      {event.status === 'cancelled' ? (
        <InlineNotice
          tone="error"
          icon="warning"
          message={`Cancelled${event.cancellationReason ? ` — ${event.cancellationReason}` : '.'}`}
        />
      ) : null}
      {notice ? <InlineNotice tone="info" icon="info" message={notice} /> : null}
      {join.isError || cancel.isError ? (
        <InlineNotice
          tone="error"
          icon="warning"
          message={eventErrorMessage(join.error ?? cancel.error)}
        />
      ) : null}

      <View style={styles.actions}>
        {!relationship && event.status === 'published' ? (
          <PrimaryButton
            label={
              event.confirmedCount >= event.capacity ? 'Join waitlist' : 'Join event'
            }
            leadingIcon="check"
            loading={join.isPending}
            onPress={handleJoin}
            style={styles.mainAction}
          />
        ) : null}
        {event.chatEnabled ? (
          <PrimaryButton
            label="Open chat"
            leadingIcon="chat"
            onPress={() =>
              router.push({ pathname: '/event/[id]/chat', params: { id: event.id } })
            }
            style={styles.mainAction}
          />
        ) : null}
        {relationship === 'confirmed' ? (
          <SecondaryButton
            label="Check in"
            leadingIcon="qrCode"
            onPress={() =>
              router.push({ pathname: '/event/[id]/check-in', params: { id: event.id } })
            }
            style={styles.mainAction}
          />
        ) : null}
        {event.isHost ? (
          <PrimaryButton
            label="Manage"
            leadingIcon="settings"
            onPress={() =>
              router.push({ pathname: '/event/[id]/manage', params: { id: event.id } })
            }
            style={styles.mainAction}
          />
        ) : null}
        {relationship ? (
          <StatusPill
            label={relationship === 'hosting' ? 'Hosting' : relationship}
            icon={relationship === 'confirmed' ? 'check' : 'clock'}
            tone={
              relationship === 'confirmed' || relationship === 'hosting'
                ? 'success'
                : 'warning'
            }
          />
        ) : null}
      </View>

      <CapacityMeter
        confirmed={event.confirmedCount}
        capacity={event.capacity}
        waitlistEnabled={event.waitlistEnabled}
      />

      <View style={[styles.section, { borderColor: theme.border }]}>
        <DetailRow
          icon="calendar"
          label="When"
          value={`${format(new Date(event.startsAt), 'EEEE, MMMM d · p')}–${format(new Date(event.endsAt), 'p')} (${event.timezone})`}
        />
        <DetailRow
          icon="location"
          label="Where"
          value={`${event.venueName}\n${event.locationDescription}`}
        />
        <DetailRow
          icon="organization"
          label="Organizer"
          value={`${event.organizationName ?? 'Independent campus host'}${event.organizationVerified ? ' · Verified' : ''}`}
        />
        <DetailRow
          icon="people"
          label="Eligibility"
          value={`Ages ${event.minAge}+${event.eligibilityRequirements ? ` · ${event.eligibilityRequirements}` : ''}`}
        />
      </View>

      <View style={styles.copySection}>
        <Text style={[styles.heading, { color: theme.text }]}>About</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>{event.description}</Text>
      </View>
      {event.accessibilityInformation ? (
        <View style={styles.copySection}>
          <Text style={[styles.heading, { color: theme.text }]}>Accessibility</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {event.accessibilityInformation}
          </Text>
        </View>
      ) : null}
      {event.costInformation ? (
        <View style={styles.copySection}>
          <Text style={[styles.heading, { color: theme.text }]}>Cost</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {event.costInformation}
          </Text>
        </View>
      ) : null}
      {event.cancellationPolicy ? (
        <View style={styles.copySection}>
          <Text style={[styles.heading, { color: theme.text }]}>Cancellation policy</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {event.cancellationPolicy}
          </Text>
        </View>
      ) : null}
      {event.safetyRules ? (
        <View style={styles.copySection}>
          <Text style={[styles.heading, { color: theme.text }]}>
            Community and safety
          </Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {event.safetyRules}
          </Text>
          <Text style={[styles.safetyLimit, { color: theme.textSubtle }]}>
            Ruckus does not perform background checks or guarantee personal safety. Call
            local emergency services for immediate danger.
          </Text>
        </View>
      ) : null}

      <View style={styles.utilityGrid}>
        <SecondaryButton
          label="Share"
          leadingIcon="share"
          onPress={() =>
            void Share.share({
              message: `${summarizeEventForShare(event)}\n${link}`,
              url: link
            })
          }
          style={styles.utility}
        />
        <SecondaryButton
          label="Calendar"
          leadingIcon="calendar"
          onPress={() => void handleCalendar()}
          style={styles.utility}
        />
        <SecondaryButton
          label={showQr ? 'Hide QR' : 'Event QR'}
          leadingIcon="qrCode"
          onPress={() => setShowQr((value) => !value)}
          style={styles.utility}
        />
        <SecondaryButton
          label="Report"
          leadingIcon="warning"
          onPress={() =>
            router.push({ pathname: '/report', params: { eventId: event.id } })
          }
          style={styles.utility}
        />
      </View>

      {showQr ? (
        <View style={[styles.qrCard, { backgroundColor: '#FFFFFF' }]}>
          <QRCode value={link} size={180} backgroundColor="#FFFFFF" color="#171918" />
          <Text style={styles.qrText}>
            Scan to open this event. No attendee data is encoded.
          </Text>
        </View>
      ) : null}

      {canCancel ? (
        <SecondaryButton
          label={relationship === 'waitlisted' ? 'Leave waitlist' : 'Cancel RSVP'}
          leadingIcon="close"
          loading={cancel.isPending}
          onPress={() =>
            Alert.alert(
              relationship === 'waitlisted' ? 'Leave the waitlist?' : 'Cancel your RSVP?',
              'Your event-chat access will end. If you held a spot, the next eligible person will be promoted.',
              [
                { text: 'Keep RSVP', style: 'cancel' },
                {
                  text: relationship === 'waitlisted' ? 'Leave waitlist' : 'Cancel RSVP',
                  style: 'destructive',
                  onPress: () =>
                    cancel.mutate(undefined, {
                      onSuccess: () => setNotice('Your RSVP was cancelled.')
                    })
                }
              ]
            )
          }
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 230,
    justifyContent: 'space-between',
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    marginVertical: tokens.space.md
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.space.sm
  },
  heroDate: {
    color: '#FFFFFF',
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold
  },
  heroTitle: {
    marginTop: tokens.space.sm,
    color: '#FFFFFF',
    fontSize: tokens.type.display,
    lineHeight: tokens.lineHeight.display,
    fontWeight: tokens.weight.heavy,
    letterSpacing: -1
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.md
  },
  mainAction: { flexGrow: 1 },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: tokens.space.lg,
    paddingTop: tokens.space.md,
    gap: tokens.space.md
  },
  detailRow: { flexDirection: 'row', gap: tokens.space.md, alignItems: 'flex-start' },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailCopy: { flex: 1, gap: 2 },
  detailLabel: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  detailValue: {
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    fontWeight: tokens.weight.medium
  },
  copySection: { marginTop: tokens.space.xl, gap: tokens.space.sm },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  body: { fontSize: tokens.type.body, lineHeight: tokens.lineHeight.body },
  safetyLimit: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  utilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginVertical: tokens.space.xl
  },
  utility: { minWidth: '46%', flexGrow: 1 },
  qrCard: {
    alignItems: 'center',
    gap: tokens.space.md,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    marginBottom: tokens.space.lg
  },
  qrText: {
    maxWidth: 240,
    color: '#343836',
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    textAlign: 'center'
  }
});
