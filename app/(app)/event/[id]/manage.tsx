import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { createAttributionToken } from '@/features/analytics/organizer-analytics-service';
import { createEventCheckinCode } from '@/features/events/event-service';
import {
  useArchiveHostedEvent,
  useCancelHostedEvent,
  useCreateEventAnnouncement,
  useDuplicateHostedEvent,
  useEventAttendees,
  useEventDetail,
  useReviewEventRsvp
} from '@/features/events/use-events';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

function Metric({ label, value }: { label: string; value: number }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.metric,
        { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
      ]}
    >
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function EventManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const { isDemo } = useAuth();
  const { theme } = useTheme();
  const event = useEventDetail(eventId ?? '');
  const dashboard = useEventAttendees(eventId ?? '');
  const review = useReviewEventRsvp(eventId ?? '');
  const announcement = useCreateEventAnnouncement(eventId ?? '');
  const cancel = useCancelHostedEvent(eventId ?? '');
  const archive = useArchiveHostedEvent(eventId ?? '');
  const duplicate = useDuplicateHostedEvent(eventId ?? '');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [checkinCode, setCheckinCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!eventId || event.isError || (!event.isLoading && !event.data?.isHost)) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="lock"
          title="Organizer access required"
          message="Only an authorized event host or organization manager can open this dashboard."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }
  if (event.isLoading || dashboard.isLoading || !event.data || !dashboard.data) {
    return (
      <AppScreen>
        <BackButton />
        <ListCardSkeleton />
        <ListCardSkeleton />
      </AppScreen>
    );
  }

  const pending = dashboard.data.attendees.filter(
    (attendee) => attendee.status === 'pending'
  );
  return (
    <AppScreen>
      <BackButton />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: theme.textMuted }]}>
            Organizer dashboard
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>{event.data.title}</Text>
        </View>
        <StatusPill label={event.data.status} tone="accent" />
      </View>
      {notice ? <InlineNotice tone="success" icon="check" message={notice} /> : null}
      {dashboard.isError || review.isError || announcement.isError || cancel.isError ? (
        <InlineNotice
          tone="error"
          icon="warning"
          message="That organizer action did not save. Refresh and try again."
        />
      ) : null}

      <View style={styles.metrics}>
        <Metric label="Confirmed" value={dashboard.data.counts.confirmed} />
        <Metric label="Pending" value={dashboard.data.counts.pending} />
        <Metric label="Waitlisted" value={dashboard.data.counts.waitlisted} />
        <Metric label="Checked in" value={dashboard.data.counts.checkedIn} />
      </View>

      <View style={[styles.section, { borderColor: theme.border }]}>
        <Text style={[styles.heading, { color: theme.text }]}>Pending requests</Text>
        {pending.length === 0 ? (
          <EmptyState
            icon="check"
            title="No requests to review"
            message="New approval-required RSVPs appear here."
          />
        ) : (
          pending.map((attendee) => (
            <View
              key={attendee.rsvpId}
              style={[
                styles.attendee,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: theme.accentMuted }]}>
                <AppIcon name="person" color={theme.primary} size={20} />
              </View>
              <View style={styles.attendeeCopy}>
                <Text style={[styles.attendeeName, { color: theme.text }]}>
                  {attendee.displayName}
                </Text>
                <Text style={[styles.attendeeMeta, { color: theme.textMuted }]}>
                  Pending approval
                </Text>
              </View>
              <SecondaryButton
                label="Decline"
                disabled={review.isPending}
                onPress={() => review.mutate({ rsvpId: attendee.rsvpId, approve: false })}
                style={styles.smallButton}
              />
              <PrimaryButton
                label="Approve"
                disabled={review.isPending}
                onPress={() => review.mutate({ rsvpId: attendee.rsvpId, approve: true })}
                style={styles.smallButton}
              />
            </View>
          ))
        )}
      </View>

      <View style={[styles.section, { borderColor: theme.border }]}>
        <Text style={[styles.heading, { color: theme.text }]}>Announcement</Text>
        <Text style={[styles.sectionCopy, { color: theme.textMuted }]}>
          Confirmed attendees receive one deduplicated notification and the announcement
          appears in event chat.
        </Text>
        <TextField
          label="Title"
          value={announcementTitle}
          onChangeText={setAnnouncementTitle}
          maxLength={120}
        />
        <TextField
          label="Message"
          value={announcementBody}
          onChangeText={setAnnouncementBody}
          maxLength={3000}
          multiline
          style={styles.multiline}
        />
        <PrimaryButton
          label="Send announcement"
          leadingIcon="send"
          loading={announcement.isPending}
          disabled={
            announcementTitle.trim().length < 2 || announcementBody.trim().length < 2
          }
          onPress={() =>
            announcement.mutate(
              { title: announcementTitle.trim(), body: announcementBody.trim() },
              {
                onSuccess: () => {
                  setAnnouncementTitle('');
                  setAnnouncementBody('');
                  setNotice('Announcement sent to confirmed attendees.');
                }
              }
            )
          }
        />
      </View>

      <View style={[styles.section, { borderColor: theme.border }]}>
        <Text style={[styles.heading, { color: theme.text }]}>Check-in</Text>
        <Text style={[styles.sectionCopy, { color: theme.textMuted }]}>
          Generate a new 60-second QR. The previous code is revoked and only confirmed
          attendees can redeem it.
        </Text>
        <PrimaryButton
          label="Rotate check-in QR"
          leadingIcon="qrCode"
          onPress={() =>
            void createEventCheckinCode(eventId, isDemo)
              .then((code) => setCheckinCode(code))
              .catch(() => setNotice('Check-in must be opened by an authorized host.'))
          }
        />
        {checkinCode ? (
          <View style={styles.qrCard}>
            <QRCode
              value={checkinCode}
              size={200}
              backgroundColor="#FFFFFF"
              color="#171918"
            />
            <Text style={styles.qrCopy}>
              Expires in 60 seconds. Rotate again if it was exposed.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.section, { borderColor: theme.border }]}>
        <Text style={[styles.heading, { color: theme.text }]}>Launch tools</Text>
        <SecondaryButton
          label="Open event analytics"
          leadingIcon="list"
          onPress={() => router.push(`/event/${eventId}/analytics` as Href)}
        />
        <SecondaryButton
          label="Duplicate as draft"
          leadingIcon="copy"
          loading={duplicate.isPending}
          onPress={() =>
            duplicate.mutate(undefined, {
              onSuccess: (duplicateId) =>
                router.replace({
                  pathname: '/event/[id]/manage',
                  params: { id: duplicateId }
                })
            })
          }
        />
        <SecondaryButton
          label="Share launch link"
          leadingIcon="share"
          onPress={() => {
            void createAttributionToken(eventId, 'event_share_link', isDemo)
              .then((attributionToken) =>
                Linking.createURL(`/public/event/${event.data.slug}`, {
                  queryParams: { a: attributionToken }
                })
              )
              .then((launchLink) =>
                Share.share({
                  message: `${event.data.title}\n${launchLink}`,
                  url: launchLink
                })
              )
              .catch(() =>
                setNotice('A tracked launch link could not be created. Try again.')
              );
          }}
        />
        <SecondaryButton
          label="Open event chat"
          leadingIcon="chat"
          onPress={() =>
            router.push({ pathname: '/event/[id]/chat', params: { id: eventId } })
          }
        />
      </View>

      <View style={[styles.section, styles.dangerSection, { borderColor: theme.border }]}>
        <Text style={[styles.heading, { color: theme.text }]}>Event lifecycle</Text>
        <TextField
          label="Cancellation reason"
          value={cancelReason}
          onChangeText={setCancelReason}
          maxLength={1000}
          help="Required before cancelling a published event. Attendees will be notified."
        />
        {event.data.status === 'published' ? (
          <PrimaryButton
            label="Cancel event"
            variant="danger"
            loading={cancel.isPending}
            disabled={cancelReason.trim().length < 3}
            onPress={() =>
              Alert.alert(
                'Cancel this event?',
                'All event-chat access will end and attendees will be notified.',
                [
                  { text: 'Keep event', style: 'cancel' },
                  {
                    text: 'Cancel event',
                    style: 'destructive',
                    onPress: () =>
                      cancel.mutate(cancelReason.trim(), {
                        onSuccess: () =>
                          setNotice('Event cancelled and attendee notifications queued.')
                      })
                  }
                ]
              )
            }
          />
        ) : null}
        {['draft', 'cancelled', 'completed'].includes(event.data.status) ? (
          <SecondaryButton
            label="Archive event"
            loading={archive.isPending}
            onPress={() => archive.mutate()}
          />
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.md,
    marginVertical: tokens.space.md
  },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  title: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.heavy
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  metric: {
    minWidth: '46%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  metricValue: { fontSize: tokens.type.title, fontWeight: tokens.weight.heavy },
  metricLabel: { marginTop: tokens.space.xs, fontSize: tokens.type.caption },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: tokens.space.xl,
    paddingTop: tokens.space.lg
  },
  dangerSection: { paddingBottom: tokens.space.xl },
  heading: {
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold,
    marginBottom: tokens.space.sm
  },
  sectionCopy: {
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    marginBottom: tokens.space.md
  },
  attendee: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
    marginBottom: tokens.space.sm
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  attendeeCopy: { flex: 1, minWidth: 120 },
  attendeeName: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  attendeeMeta: { marginTop: 2, fontSize: tokens.type.micro },
  smallButton: { minHeight: 42 },
  multiline: { minHeight: 96, paddingTop: tokens.space.md, textAlignVertical: 'top' },
  qrCard: {
    alignItems: 'center',
    gap: tokens.space.md,
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    marginTop: tokens.space.md
  },
  qrCopy: { color: '#343836', fontSize: tokens.type.caption, textAlign: 'center' }
});
