import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useMyOrganizations } from '@/features/organizations/use-organizations';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function OrganizationsScreen() {
  const { theme } = useTheme();
  const organizations = useMyOrganizations();

  return (
    <AppScreen
      eyebrow="Organizer tools"
      title="Organizations"
      subtitle="Create a campus club profile, invite officers, and host events together."
    >
      <BackButton label="Profile" onPress={() => router.back()} />
      <InlineNotice message="Verification is reviewed. Creating a profile never implies a university partnership or endorsement." />
      <PrimaryButton
        label="Create organization"
        leadingIcon="add"
        onPress={() => router.push('/organization/create')}
        style={styles.create}
      />

      {organizations.isLoading ? <ListCardSkeleton count={2} /> : null}
      {organizations.isError ? (
        <ErrorState
          title="Organizations unavailable"
          message="Your memberships are unchanged. Try again."
          actionLabel="Try again"
          onAction={() => void organizations.refetch()}
        />
      ) : null}
      {!organizations.isLoading &&
      !organizations.isError &&
      !organizations.data?.length ? (
        <EmptyState
          icon="organization"
          title="No organization yet"
          message="Create one for your club, or ask an officer to invite your Ruckus username."
        />
      ) : null}

      <View accessibilityRole="list" style={styles.list}>
        {organizations.data?.map((organization) => (
          <Pressable
            key={organization.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${organization.name}`}
            onPress={() => router.push(`/organization/${organization.id}`)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
                opacity: pressed ? 0.72 : 1
              }
            ]}
          >
            <View style={[styles.icon, { backgroundColor: theme.accentMuted }]}>
              <AppIcon name="organization" color={theme.accent} size={24} />
            </View>
            <View style={styles.cardCopy}>
              <View style={styles.cardHeading}>
                <Text style={[styles.name, { color: theme.text }]}>
                  {organization.name}
                </Text>
                {organization.isVerified ? (
                  <StatusPill label="Verified" tone="success" />
                ) : null}
              </View>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {organization.campusName} · {organization.role.replace('_', ' ')}
              </Text>
              {organization.membershipStatus === 'invited' ? (
                <Text style={[styles.invited, { color: theme.accent }]}>
                  Invitation waiting
                </Text>
              ) : null}
              {organization.isRestricted ? (
                <Text style={[styles.invited, { color: theme.danger }]}>Restricted</Text>
              ) : null}
            </View>
            <AppIcon name="forward" color={theme.textSubtle} />
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  create: { marginBottom: tokens.space.lg },
  list: { gap: tokens.space.md },
  card: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  cardCopy: { flex: 1, marginHorizontal: tokens.space.md },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  name: { flex: 1, fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  meta: { marginTop: 4, fontSize: tokens.type.caption, textTransform: 'capitalize' },
  invited: { marginTop: 4, fontSize: tokens.type.caption, fontWeight: tokens.weight.bold }
});
