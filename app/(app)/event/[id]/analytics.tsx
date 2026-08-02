import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { SecondaryButton } from '@/components/ui/secondary-button';
import type {
  AnalyticsPeriod,
  AnalyticsRate
} from '@/features/analytics/organizer-analytics-types';
import {
  useEventAnalytics,
  useEventAnalyticsExport
} from '@/features/analytics/use-organizer-analytics';
import { useEventDetail } from '@/features/events/use-events';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const periods: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'semester', label: 'Semester' },
  { value: 'lifecycle', label: 'Lifecycle' }
];

const attributionLabels: Record<string, string> = {
  direct: 'Direct',
  event_share_link: 'Event share link',
  user_referral: 'User referral',
  ambassador: 'Ambassador',
  organization_page: 'Organization page',
  campus_campaign: 'Campus campaign',
  qr_poster: 'QR poster',
  public_search: 'Public search',
  internal_recommendation: 'Ruckus recommendation',
  welcome_week: 'Welcome Week'
};

function Metric({ label, value }: { label: string; value: number | string }) {
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

function RateRow({ label, rate }: { label: string; rate: AnalyticsRate }) {
  const { theme } = useTheme();
  const value = rate.value === null ? '—' : `${Math.round(rate.value * 100)}%`;
  return (
    <View style={[styles.rateRow, { borderBottomColor: theme.border }]}>
      <View style={styles.rateCopy}>
        <Text style={[styles.rateLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.denominator, { color: theme.textMuted }]}>
          {rate.numerator.toLocaleString()} ÷ {rate.denominator.toLocaleString()}
        </Text>
      </View>
      <Text style={[styles.rateValue, { color: theme.primary }]}>{value}</Text>
    </View>
  );
}

export default function EventAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const { theme } = useTheme();
  const [period, setPeriod] = useState<AnalyticsPeriod>('lifecycle');
  const [notice, setNotice] = useState('');
  const event = useEventDetail(eventId ?? '');
  const analytics = useEventAnalytics(eventId ?? '', period);
  const exporter = useEventAnalyticsExport(eventId ?? '', period);

  const downloadCsv = () => {
    exporter.mutate(undefined, {
      onSuccess: (csv) => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = `ruckus-event-analytics-${period}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        } else {
          void Share.share({ title: 'Ruckus event analytics CSV', message: csv });
        }
        setNotice('Aggregate CSV exported. This action was added to the audit log.');
      }
    });
  };

  if (!eventId || event.isError || (!event.isLoading && !event.data?.isHost)) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="lock"
          title="Organizer access required"
          message="Only an authorized event host or organization manager can view these aggregates."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  if (event.isLoading || !event.data) {
    return (
      <AppScreen>
        <BackButton />
        <ListCardSkeleton count={3} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BackButton />
      <Text style={[styles.eyebrow, { color: theme.textMuted }]}>
        Organizer analytics
      </Text>
      <Text style={[styles.title, { color: theme.text }]}>{event.data.title}</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Cached, aggregate event performance in {event.data.timezone}. No attendee,
        message, report, precise-location, email, or phone data appears here.
      </Text>

      <View accessibilityRole="tablist" style={styles.periods}>
        {periods.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: period === option.value }}
            onPress={() => setPeriod(option.value)}
            style={[
              styles.period,
              {
                backgroundColor:
                  period === option.value ? theme.accentMuted : theme.surfaceMuted,
                borderColor: period === option.value ? theme.primary : theme.border
              }
            ]}
          >
            <Text
              style={[
                styles.periodLabel,
                { color: period === option.value ? theme.primary : theme.textMuted }
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {notice ? <InlineNotice tone="success" icon="check" message={notice} /> : null}
      {analytics.isError ? (
        <ErrorState
          icon="warning"
          title={
            period === 'semester' ? 'Semester not configured' : 'Analytics unavailable'
          }
          message={
            period === 'semester'
              ? 'A campus administrator must configure the academic term before semester reporting can be used.'
              : 'The aggregate could not be refreshed. Try again.'
          }
          actionLabel="Retry"
          onAction={() => void analytics.refetch()}
        />
      ) : analytics.isLoading || !analytics.data ? (
        <ListCardSkeleton count={3} />
      ) : (
        <>
          <Text style={[styles.range, { color: theme.textMuted }]}>
            {analytics.data.range.start} — {analytics.data.range.end}
          </Text>
          <View style={styles.metrics}>
            <Metric
              label="Feed impressions"
              value={analytics.data.counts.feedImpressions}
            />
            <Metric label="Card opens" value={analytics.data.counts.eventCardOpens} />
            <Metric label="Join attempts" value={analytics.data.counts.joinAttempts} />
            <Metric label="Confirmed" value={analytics.data.counts.confirmedRsvps} />
            <Metric label="Pending" value={analytics.data.counts.pendingRequests} />
            <Metric label="Waitlisted" value={analytics.data.counts.waitlistAdditions} />
            <Metric label="Promoted" value={analytics.data.counts.waitlistPromotions} />
            <Metric label="Cancelled" value={analytics.data.counts.cancellations} />
            <Metric label="Check-ins" value={analytics.data.counts.checkins} />
            <Metric label="No-shows" value={analytics.data.counts.noShows} />
            <Metric label="Shares" value={analytics.data.counts.shares} />
            <Metric
              label="Referral visits"
              value={analytics.data.counts.referralVisits}
            />
            <Metric
              label="Chat participants"
              value={analytics.data.counts.chatParticipants}
            />
            <Metric label="Ratings" value={analytics.data.counts.ratings} />
            <Metric
              label="Repeat attendees"
              value={analytics.data.counts.repeatAttendees}
            />
            <Metric
              label="Average rating"
              value={analytics.data.counts.ratingAverage?.toFixed(1) ?? '—'}
            />
          </View>

          <View style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.heading, { color: theme.text }]}>Funnel rates</Text>
            <Text style={[styles.sectionCopy, { color: theme.textMuted }]}>
              Every rate shows its numerator and denominator so conversion definitions are
              auditable.
            </Text>
            <RateRow label="Detail-view rate" rate={analytics.data.rates.detailView} />
            <RateRow label="RSVP conversion" rate={analytics.data.rates.rsvpConversion} />
            <RateRow
              label="Attendance conversion"
              rate={analytics.data.rates.attendanceConversion}
            />
            <RateRow label="Cancellation rate" rate={analytics.data.rates.cancellation} />
            <RateRow label="No-show rate" rate={analytics.data.rates.noShow} />
            <RateRow
              label="Waitlist conversion"
              rate={analytics.data.rates.waitlistConversion}
            />
            <RateRow
              label="Share conversion"
              rate={analytics.data.rates.shareConversion}
            />
            <RateRow
              label="Repeat-attendee rate"
              rate={analytics.data.rates.repeatAttendee}
            />
          </View>

          <View style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.heading, { color: theme.text }]}>Attribution</Text>
            {Object.entries(analytics.data.attributionSources).length ? (
              Object.entries(analytics.data.attributionSources).map(([source, count]) => (
                <View key={source} style={styles.sourceRow}>
                  <Text style={[styles.sourceLabel, { color: theme.textMuted }]}>
                    {attributionLabels[source] ?? source}
                  </Text>
                  <Text style={[styles.sourceCount, { color: theme.text }]}>{count}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.sectionCopy, { color: theme.textMuted }]}>
                No validated attribution visits in this period.
              </Text>
            )}
          </View>

          <View style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.heading, { color: theme.text }]}>Activity timeline</Text>
            <Text style={[styles.sectionCopy, { color: theme.textMuted }]}>
              RSVP velocity, cancellations, check-ins, chat participation, and referrals
              by local event day.
            </Text>
            {analytics.data.timeline.slice(-12).map((point) => (
              <View
                key={point.date}
                style={[styles.timelineRow, { borderColor: theme.border }]}
              >
                <Text style={[styles.timelineDate, { color: theme.text }]}>
                  {point.date}
                </Text>
                <Text style={[styles.timelineValue, { color: theme.textMuted }]}>
                  {point.rsvpVelocity} RSVP · {point.cancellations} cancel ·{' '}
                  {point.checkins} check-in · {point.chatParticipants} chat ·{' '}
                  {point.referralVisits} referral
                </Text>
              </View>
            ))}
          </View>

          <InlineNotice
            icon="lock"
            message={`${analytics.data.privacy.heatmapMeaning} Cells below ${analytics.data.privacy.eventCellThreshold} participants are suppressed.`}
          />
          <SecondaryButton
            label="Export aggregate CSV"
            leadingIcon="document"
            loading={exporter.isPending}
            onPress={downloadCsv}
          />
          {exporter.isError ? (
            <InlineNotice
              tone="error"
              message="The export was not created. Confirm organizer access and retry."
            />
          ) : null}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  title: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.heavy
  },
  subtitle: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  periods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginVertical: tokens.space.lg
  },
  period: {
    minHeight: tokens.touchTarget,
    minWidth: 88,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.md
  },
  periodLabel: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  range: { marginBottom: tokens.space.md, fontSize: tokens.type.caption },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  metric: {
    minWidth: '46%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  metricValue: { fontSize: tokens.type.heading, fontWeight: tokens.weight.heavy },
  metricLabel: { marginTop: tokens.space.xs, fontSize: tokens.type.caption },
  section: {
    marginTop: tokens.space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space.lg
  },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  sectionCopy: {
    marginTop: tokens.space.xs,
    marginBottom: tokens.space.sm,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  rateRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  rateCopy: { flex: 1 },
  rateLabel: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  denominator: { marginTop: 2, fontSize: tokens.type.micro },
  rateValue: { fontSize: tokens.type.heading, fontWeight: tokens.weight.heavy },
  sourceRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center' },
  sourceLabel: { flex: 1, fontSize: tokens.type.label },
  sourceCount: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  timelineRow: {
    marginBottom: tokens.space.sm,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    padding: tokens.space.md
  },
  timelineDate: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  timelineValue: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  }
});
