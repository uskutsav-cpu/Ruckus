import { format } from 'date-fns';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Share, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';

import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { fetchPublicEvent } from '@/features/public/public-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function PublicEventScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const eventSlug = Array.isArray(slug) ? slug[0] : slug;
  const { isDemo, user } = useAuth();
  const { theme } = useTheme();
  const event = useQuery({
    queryKey: ['public-event', eventSlug, isDemo],
    queryFn: () => fetchPublicEvent(eventSlug ?? '', isDemo),
    enabled: Boolean(eventSlug)
  });

  if (event.isLoading) {
    return (
      <AppScreen contentStyle={styles.screen}>
        <PublicHeader />
        <ListCardSkeleton count={3} />
      </AppScreen>
    );
  }
  if (event.isError || !event.data?.id) {
    return (
      <AppScreen contentStyle={styles.screen}>
        <PublicHeader />
        <ErrorState
          icon="calendar"
          title="Event link unavailable"
          message="This event may be private, removed, expired, or unavailable. Private details and attendee data are never exposed here."
          actionLabel="Go to Ruckus"
          onAction={() => router.replace('/public')}
        />
      </AppScreen>
    );
  }

  const data = event.data;
  const eventLink = Linking.createURL(`/public/event/${data.slug}`);
  const cancelled = data.status === 'cancelled';
  const completed = data.status === 'completed';
  const description =
    `${data.title} at ${data.campus_name}. ${data.description ?? ''}`.slice(0, 240);

  return (
    <AppScreen contentStyle={styles.screen}>
      <Head>
        <title>{data.title} · Ruckus</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={`${data.title} · Ruckus`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Head>
      <PublicHeader />
      <View style={styles.content}>
        <View style={styles.badges}>
          <StatusPill label={data.category ?? 'Campus event'} tone="accent" />
          <StatusPill
            label={cancelled ? 'Cancelled' : completed ? 'Completed' : 'Published'}
            tone={cancelled ? 'warning' : completed ? 'neutral' : 'success'}
          />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{data.title}</Text>
        <Text style={[styles.summary, { color: theme.textMuted }]}>
          {data.description}
        </Text>
        {cancelled ? (
          <InlineNotice
            tone="error"
            icon="warning"
            message={`This event was cancelled${data.cancellation_reason ? `: ${data.cancellation_reason}` : '.'}`}
          />
        ) : null}

        <View
          style={[
            styles.details,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
          ]}
        >
          <Detail
            icon="calendar"
            label="When"
            value={
              data.starts_at && data.ends_at
                ? `${format(new Date(data.starts_at), 'EEEE, MMMM d · h:mm a')}–${format(new Date(data.ends_at), 'h:mm a')} (${data.timezone})`
                : 'Schedule unavailable'
            }
          />
          <Detail
            icon="location"
            label="Where"
            value={`${data.venue_name ?? 'Venue to be announced'}${data.location_description ? ` · ${data.location_description}` : ''}`}
          />
          <Detail
            icon="organization"
            label="Organizer"
            value={`${data.organization_name ?? 'Independent campus host'}${data.organization_verified ? ' · Verified organization' : ''}`}
          />
          <Detail
            icon="people"
            label="Entry"
            value={`${data.capacity ?? 'Limited'} spots${data.waitlist_enabled ? ' · Waitlist available when full' : ''}${data.approval_required ? ' · Host approval required' : ''}`}
          />
          {data.accessibility_information ? (
            <Detail
              icon="accessibility"
              label="Accessibility"
              value={data.accessibility_information}
            />
          ) : null}
          {data.cost_information ? (
            <Detail icon="info" label="Cost" value={data.cost_information} />
          ) : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={
              cancelled || completed
                ? 'Browse current events'
                : user
                  ? 'Open in Ruckus'
                  : 'Sign in to RSVP'
            }
            onPress={() =>
              router.push(
                cancelled || completed
                  ? user
                    ? '/discover'
                    : '/sign-up'
                  : user
                    ? { pathname: '/event/[id]', params: { id: data.id! } }
                    : '/sign-in'
              )
            }
            style={styles.action}
          />
          <SecondaryButton
            label="Share event"
            leadingIcon="share"
            onPress={() =>
              void Share.share({
                title: `${data.title} · Ruckus`,
                message: `${data.title}\n${eventLink}`
              })
            }
            style={styles.action}
          />
        </View>

        <View style={[styles.qrCard, { borderColor: theme.border }]}>
          <View style={styles.qrCopy}>
            <Text style={[styles.qrTitle, { color: theme.text }]}>Share this event</Text>
            <Text style={[styles.qrBody, { color: theme.textMuted }]}>
              This code opens the public event page. It contains no attendee, chat, or
              private-location data.
            </Text>
          </View>
          <View style={styles.qr}>
            <QRCode value={eventLink} size={120} />
          </View>
        </View>
        {data.cancellation_policy ? (
          <InlineNotice message={`Cancellation policy: ${data.cancellation_policy}`} />
        ) : null}
      </View>
      <PublicFooter />
    </AppScreen>
  );
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.detail}>
      <AppIcon name={icon} color={theme.primary} size={20} />
      <View style={styles.detailCopy}>
        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  content: { paddingTop: 48 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.hero,
    lineHeight: tokens.lineHeight.hero,
    fontWeight: tokens.weight.black
  },
  summary: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.heading,
    lineHeight: 31
  },
  details: {
    gap: tokens.space.lg,
    marginTop: tokens.space.xl,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg
  },
  detail: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space.md },
  detailCopy: { flex: 1 },
  detailLabel: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  detailValue: {
    marginTop: 3,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginTop: 28
  },
  action: { minWidth: 220, flexGrow: 1 },
  qrCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space.lg,
    marginTop: tokens.space.xl,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg
  },
  qrCopy: { minWidth: 210, flex: 1 },
  qrTitle: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  qrBody: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  },
  qr: {
    padding: tokens.space.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.sm
  }
});
