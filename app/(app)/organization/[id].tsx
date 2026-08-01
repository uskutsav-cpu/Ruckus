import { useState } from 'react';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import {
  useChangeOrganizationMemberRole,
  useInviteOrganizationMember,
  useOrganizationDashboard,
  useRemoveOrganizationMember,
  useRespondToOrganizationInvitation,
  useSubmitOrganizationVerification
} from '@/features/organizations/use-organizations';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';
import type { OrganizationRole } from '@/types/database';

const roleOptions = [
  { value: 'event_manager', label: 'Events' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'admin', label: 'Admin' }
] as const;

export default function OrganizationDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const organizationId = id ?? '';
  const { theme } = useTheme();
  const dashboard = useOrganizationDashboard(organizationId);
  const respond = useRespondToOrganizationInvitation(organizationId);
  const invite = useInviteOrganizationMember(organizationId);
  const changeRole = useChangeOrganizationMemberRole(organizationId);
  const remove = useRemoveOrganizationMember(organizationId);
  const verify = useSubmitOrganizationVerification(organizationId);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Exclude<OrganizationRole, 'owner'>>('event_manager');
  const [relationship, setRelationship] = useState('');
  const [contact, setContact] = useState('');
  const [requestKind, setRequestKind] = useState<'verification' | 'claim'>(
    'verification'
  );
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string } | null>(
    null
  );

  if (dashboard.isLoading) {
    return (
      <AppScreen>
        <BackButton label="Organizations" onPress={() => router.back()} />
        <ListCardSkeleton count={4} />
      </AppScreen>
    );
  }
  if (dashboard.isError || !dashboard.data) {
    return (
      <AppScreen>
        <BackButton label="Organizations" onPress={() => router.back()} />
        <ErrorState
          title="Organization unavailable"
          message="You may no longer have access, or the profile could not be loaded."
          actionLabel="Try again"
          onAction={() => void dashboard.refetch()}
        />
      </AppScreen>
    );
  }

  const data = dashboard.data;
  const canManage = ['owner', 'admin', 'event_manager'].includes(
    data.membership?.role ?? ''
  );
  const canManagePeople = ['owner', 'admin'].includes(data.membership?.role ?? '');
  const hasOpenVerification = data.verificationRequests.some((request) =>
    ['submitted', 'under_review'].includes(request.status)
  );

  const inviteMember = async () => {
    setNotice(null);
    if (username.trim().length < 3) {
      setNotice({ tone: 'error', text: 'Enter the member’s Ruckus username.' });
      return;
    }
    try {
      await invite.mutateAsync({ username: username.trim(), role });
      setUsername('');
      setNotice({
        tone: 'info',
        text: 'Invitation created. The member must accept it from their account.'
      });
    } catch {
      setNotice({
        tone: 'error',
        text: 'Invitation failed. Confirm the username, campus, and existing membership.'
      });
    }
  };

  const requestVerification = async () => {
    setNotice(null);
    if (relationship.trim().length < 10 || contact.trim().length < 3) {
      setNotice({
        tone: 'error',
        text: 'Describe your campus relationship and provide a verifiable contact path.'
      });
      return;
    }
    try {
      await verify.mutateAsync({ requestKind, relationship, contact });
      setRelationship('');
      setContact('');
      setNotice({
        tone: 'info',
        text: `${requestKind === 'claim' ? 'Organization claim' : 'Verification'} request submitted for review.`
      });
    } catch {
      setNotice({
        tone: 'error',
        text: 'Verification was not submitted. An open request may already exist.'
      });
    }
  };

  return (
    <AppScreen>
      <BackButton label="Organizations" onPress={() => router.back()} />
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={[styles.heading, { color: theme.text }]}>
            {data.organization.name}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {data.organization.campusName} · {data.membership?.role.replace('_', ' ')}
          </Text>
        </View>
        <StatusPill
          label={data.organization.isVerified ? 'Verified' : 'Unverified'}
          tone={data.organization.isVerified ? 'success' : 'neutral'}
        />
      </View>
      <Text style={[styles.description, { color: theme.textMuted }]}>
        {data.organization.description}
      </Text>
      {data.organization.isRestricted ? (
        <InlineNotice
          tone="error"
          message="This organization is restricted from publishing or managing new activity."
        />
      ) : null}
      {notice ? <InlineNotice tone={notice.tone} message={notice.text} /> : null}

      {data.membership?.status === 'invited' ? (
        <Section title="Officer invitation">
          <Text style={[styles.help, { color: theme.textMuted }]}>
            Review the profile before accepting. Declining removes this pending
            membership.
          </Text>
          <View style={styles.rowButtons}>
            <PrimaryButton
              label="Accept"
              onPress={() => void respond.mutateAsync(true)}
              loading={respond.isPending}
              style={styles.flex}
            />
            <PrimaryButton
              label="Decline"
              variant="secondary"
              onPress={() => void respond.mutateAsync(false).then(() => router.back())}
              disabled={respond.isPending}
              style={styles.flex}
            />
          </View>
        </Section>
      ) : null}

      {canManage ? (
        <View style={styles.rowButtons}>
          <PrimaryButton
            label="Create event"
            leadingIcon="add"
            onPress={() =>
              router.push({ pathname: '/create-event', params: { organizationId } })
            }
            style={styles.flex}
          />
          <PrimaryButton
            label="Share profile"
            variant="secondary"
            leadingIcon="share"
            onPress={() => router.push(`/public/organization/${data.organization.slug}`)}
            style={styles.flex}
          />
        </View>
      ) : null}

      <Section title="Event history">
        {data.events.length ? (
          data.events.map((event) => (
            <Pressable
              key={event.id}
              accessibilityRole="button"
              onPress={() => router.push(`/event/${event.id}`)}
              style={[styles.listRow, { borderColor: theme.border }]}
            >
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  {event.title}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {format(new Date(event.startsAt), 'MMM d, yyyy · h:mm a')} ·{' '}
                  {event.confirmedCount}/{event.capacity} confirmed
                </Text>
              </View>
              <StatusPill label={event.status} tone="neutral" />
            </Pressable>
          ))
        ) : (
          <Text style={[styles.help, { color: theme.textMuted }]}>No events yet.</Text>
        )}
      </Section>

      {canManagePeople ? (
        <Section title="Officer access">
          {data.members.map((member) => (
            <View key={member.id} style={[styles.member, { borderColor: theme.border }]}>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  {member.displayName}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  @{member.username ?? 'username-pending'} ·{' '}
                  {member.role.replace('_', ' ')} · {member.status}
                </Text>
              </View>
              {member.role !== 'owner' && member.status === 'active' ? (
                <PrimaryButton
                  label="Manage"
                  variant="ghost"
                  onPress={() =>
                    Alert.alert(member.displayName, 'Choose a membership action.', [
                      {
                        text: 'Make event manager',
                        onPress: () =>
                          void changeRole.mutateAsync({
                            profileId: member.profileId,
                            role: 'event_manager'
                          })
                      },
                      {
                        text: 'Make moderator',
                        onPress: () =>
                          void changeRole.mutateAsync({
                            profileId: member.profileId,
                            role: 'moderator'
                          })
                      },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => void remove.mutateAsync(member.profileId)
                      },
                      { text: 'Cancel', style: 'cancel' }
                    ])
                  }
                  style={styles.smallButton}
                />
              ) : null}
            </View>
          ))}
          <TextField
            label="Invite by Ruckus username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="student_handle"
          />
          <SegmentedControl
            accessibilityLabel="Officer role"
            value={role}
            options={roleOptions}
            onChange={setRole}
          />
          <PrimaryButton
            label="Invite officer"
            variant="secondary"
            leadingIcon="person"
            loading={invite.isPending}
            onPress={() => void inviteMember()}
            style={styles.topGap}
          />
        </Section>
      ) : null}

      {canManage && !data.organization.isVerified ? (
        <Section title="Verification & claims">
          {hasOpenVerification ? (
            <InlineNotice message="A verification request is already under review. Ruckus will not display a verified badge until it is approved." />
          ) : (
            <>
              <SegmentedControl
                accessibilityLabel="Request type"
                value={requestKind}
                options={[
                  { value: 'verification', label: 'Verify' },
                  { value: 'claim', label: 'Claim' }
                ]}
                onChange={setRequestKind}
              />
              <TextField
                label="Campus relationship"
                value={relationship}
                onChangeText={setRelationship}
                multiline
                style={styles.multiline}
                help="Explain your role and how the club is connected to this campus."
              />
              <TextField
                label="Verification contact"
                value={contact}
                onChangeText={setContact}
                help="A faculty adviser, registered-club page, or campus office contact."
              />
              <PrimaryButton
                label={
                  requestKind === 'claim'
                    ? 'Request organization claim'
                    : 'Request verification'
                }
                variant="secondary"
                loading={verify.isPending}
                onPress={() => void requestVerification()}
              />
            </>
          )}
        </Section>
      ) : null}
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

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  headingCopy: { flex: 1 },
  heading: { fontSize: tokens.type.title, fontWeight: tokens.weight.bold },
  meta: { marginTop: 4, fontSize: tokens.type.caption, textTransform: 'capitalize' },
  description: {
    marginTop: tokens.space.md,
    marginBottom: tokens.space.lg,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  },
  section: { marginTop: tokens.space.xl },
  sectionTitle: {
    marginBottom: tokens.space.md,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold
  },
  help: { fontSize: tokens.type.body, lineHeight: tokens.lineHeight.body },
  rowButtons: { flexDirection: 'row', gap: tokens.space.sm },
  flex: { flex: 1 },
  listRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: tokens.space.md,
    gap: tokens.space.sm
  },
  member: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: tokens.space.sm
  },
  rowTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  smallButton: { minWidth: 88 },
  topGap: { marginTop: tokens.space.md },
  multiline: { minHeight: 100, paddingTop: tokens.space.md, textAlignVertical: 'top' }
});
