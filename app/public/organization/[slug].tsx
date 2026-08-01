import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { ErrorState } from '@/components/ui/error-state';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { fetchPublicOrganization } from '@/features/public/public-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function PublicOrganizationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const organizationSlug = Array.isArray(slug) ? slug[0] : slug;
  const { isDemo, user } = useAuth();
  const { theme } = useTheme();
  const query = useQuery({
    queryKey: ['public-organization', organizationSlug, isDemo],
    queryFn: () => fetchPublicOrganization(organizationSlug ?? '', isDemo),
    enabled: Boolean(organizationSlug)
  });

  if (query.isLoading) {
    return (
      <AppScreen contentStyle={styles.screen}>
        <PublicHeader />
        <ListCardSkeleton count={3} />
      </AppScreen>
    );
  }
  if (query.isError || !query.data) {
    return (
      <AppScreen contentStyle={styles.screen}>
        <PublicHeader />
        <ErrorState
          icon="organization"
          title="Organization unavailable"
          message="This profile may be restricted, removed, or unavailable. No private officer details are exposed."
          actionLabel="Go to Ruckus"
          onAction={() => router.replace('/public')}
        />
      </AppScreen>
    );
  }

  const { organization, events } = query.data;
  const description =
    `${organization.name} at ${organization.campus_name}. ${organization.description ?? ''}`.slice(
      0,
      240
    );
  return (
    <AppScreen contentStyle={styles.screen}>
      <Head>
        <title>{organization.name} · Ruckus</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={`${organization.name} · Ruckus`} />
        <meta property="og:description" content={description} />
      </Head>
      <PublicHeader />
      <View style={styles.content}>
        <View style={[styles.mark, { backgroundColor: theme.accentMuted }]}>
          <AppIcon name="organization" color={theme.accent} size={36} />
        </View>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>{organization.name}</Text>
          <StatusPill
            label={organization.is_verified ? 'Verified' : 'Unverified'}
            tone={organization.is_verified ? 'success' : 'neutral'}
          />
        </View>
        <Text style={[styles.campus, { color: theme.textMuted }]}>
          {organization.campus_name}
        </Text>
        <Text style={[styles.description, { color: theme.textMuted }]}>
          {organization.description}
        </Text>
        {!organization.is_verified ? (
          <Text style={[styles.disclosure, { color: theme.textSubtle }]}>
            This organization has not been verified by Ruckus. Its presence does not imply
            university endorsement.
          </Text>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Public events</Text>
        {events.length ? (
          <View style={styles.events}>
            {events.map((event) => (
              <Pressable
                key={event.id}
                accessibilityRole="link"
                onPress={() => router.push(`/public/event/${event.slug}`)}
                style={({ pressed }) => [
                  styles.event,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                    opacity: pressed ? 0.72 : 1
                  }
                ]}
              >
                <View style={styles.eventCopy}>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventMeta, { color: theme.textMuted }]}>
                    {event.starts_at
                      ? format(new Date(event.starts_at), 'EEE, MMM d · h:mm a')
                      : 'Date unavailable'}{' '}
                    · {event.venue_name}
                  </Text>
                </View>
                <StatusPill label={event.status ?? 'published'} tone="neutral" />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={[styles.description, { color: theme.textMuted }]}>
            No public events are currently listed.
          </Text>
        )}
        <PrimaryButton
          label={user ? 'Open Ruckus' : 'Join Ruckus'}
          onPress={() => router.push(user ? '/discover' : '/sign-up')}
          style={styles.cta}
        />
      </View>
      <PublicFooter />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  content: { paddingTop: 48 },
  mark: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space.md,
    marginTop: tokens.space.lg
  },
  title: {
    flex: 1,
    fontSize: tokens.type.hero,
    lineHeight: tokens.lineHeight.hero,
    fontWeight: tokens.weight.black
  },
  campus: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold
  },
  description: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  },
  disclosure: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  sectionTitle: {
    marginTop: 40,
    fontSize: tokens.type.title,
    fontWeight: tokens.weight.black
  },
  events: { gap: tokens.space.md, marginTop: tokens.space.lg },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  eventCopy: { flex: 1 },
  eventTitle: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  eventMeta: { marginTop: 5, fontSize: tokens.type.caption },
  cta: { marginTop: tokens.space.xl }
});
