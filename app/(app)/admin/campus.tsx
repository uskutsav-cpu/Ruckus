import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatePanel } from '@/components/ui/state-panel';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import type { CampusAnnouncementAudience } from '@/features/campus-admin/campus-admin-types';
import { hasCampusCapability } from '@/features/campus-admin/campus-admin-types';
import {
  useAmbassadorApplications,
  useReviewAmbassadorApplication
} from '@/features/growth/use-ambassador';
import {
  useApproveAnnouncement,
  useCampusAdminAccess,
  useCampusAggregateExport,
  useCampusAnnouncements,
  useCampusAuditLog,
  useCampusOverview,
  useCampusSafetyEscalations,
  useCampusVerificationQueue,
  useCreateAnnouncement,
  useResolveEscalation,
  useReviewVerification,
  useSubmitAnnouncement
} from '@/features/campus-admin/use-campus-admin';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type CampusTab =
  'overview' | 'verification' | 'ambassadors' | 'announcements' | 'safety' | 'audit';

const audiences: readonly { value: CampusAnnouncementAudience; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'organizers', label: 'Organizers' }
];

function formatMetric(value: number | null, suppressed: boolean): string {
  if (suppressed || value === null) return 'Withheld';
  return value.toLocaleString();
}

function MetricTile({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.tile, { backgroundColor: theme.surfaceMuted }]}
    >
      <Text style={[styles.tileValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: theme.textSubtle }]}>{label}</Text>
      {hint ? (
        <Text style={[styles.tileHint, { color: theme.textSubtle }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export default function CampusAdministrationScreen() {
  const { theme } = useTheme();
  const access = useCampusAdminAccess();
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [requestedTab, setRequestedTab] = useState<CampusTab | null>(null);

  const assignments = useMemo(() => access.data?.campuses ?? [], [access.data]);
  // Selection is derived rather than synchronised through an effect, so the first
  // assignment is used until the administrator picks a different campus.
  const campusId = selectedCampusId ?? assignments[0]?.campusId ?? null;

  const capabilities = useMemo(
    () => ({
      overview: hasCampusCapability(access.data, campusId, 'overview'),
      verification: hasCampusCapability(access.data, campusId, 'verification'),
      announcements: hasCampusCapability(access.data, campusId, 'announcements'),
      moderation: hasCampusCapability(access.data, campusId, 'moderation'),
      ambassadors: hasCampusCapability(access.data, campusId, 'ambassadors'),
      audit: hasCampusCapability(access.data, campusId, 'audit'),
      export: hasCampusCapability(access.data, campusId, 'export')
    }),
    [access.data, campusId]
  );

  const tabs = useMemo(() => {
    const available: { value: CampusTab; label: string }[] = [];
    if (capabilities.overview) available.push({ value: 'overview', label: 'Overview' });
    if (capabilities.verification)
      available.push({ value: 'verification', label: 'Verify' });
    if (capabilities.ambassadors)
      available.push({ value: 'ambassadors', label: 'Ambassadors' });
    if (capabilities.announcements)
      available.push({ value: 'announcements', label: 'Notices' });
    if (capabilities.moderation) available.push({ value: 'safety', label: 'Safety' });
    if (capabilities.audit) available.push({ value: 'audit', label: 'Audit' });
    return available;
  }, [capabilities]);

  // A requested tab is honoured only while the caller still holds the role that
  // exposes it, so losing a role falls back to the first permitted section.
  const tab: CampusTab =
    requestedTab && tabs.some((entry) => entry.value === requestedTab)
      ? requestedTab
      : (tabs[0]?.value ?? 'overview');

  if (access.isPending) {
    return (
      <AppScreen title="Campus administration">
        <BackButton />
        <ListCardSkeleton />
      </AppScreen>
    );
  }

  if (access.isError) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="warning"
          title="Campus administration unavailable"
          message="We could not confirm your campus administration access. Try again shortly."
        />
      </AppScreen>
    );
  }

  const hasAnyAccess =
    (access.data?.platformAdministrator ?? false) || assignments.length > 0;

  if (!hasAnyAccess) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="lock"
          title="Campus administration access required"
          message="Campus administration is limited to staff a platform administrator has granted a campus role."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title="Campus administration"
      eyebrow="University staff"
      subtitle="Campus-scoped tools. Every action here is written to the campus audit log."
      scroll
    >
      <BackButton />

      {assignments.length > 1 ? (
        <View style={styles.campusRow}>
          {assignments.map((assignment) => (
            <Pressable
              key={`${assignment.campusId}-${assignment.role}`}
              accessibilityRole="button"
              accessibilityLabel={`Select ${assignment.campusName}`}
              accessibilityState={{ selected: assignment.campusId === campusId }}
              onPress={() => setSelectedCampusId(assignment.campusId)}
            >
              <StatusPill
                label={assignment.campusName}
                tone={assignment.campusId === campusId ? 'accent' : 'neutral'}
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {tabs.length > 1 ? (
        <SegmentedControl
          accessibilityLabel="Campus administration section"
          value={tab}
          options={tabs}
          onChange={setRequestedTab}
        />
      ) : null}

      {tab === 'overview' && capabilities.overview ? (
        <OverviewPanel campusId={campusId} canExport={capabilities.export} />
      ) : null}
      {tab === 'verification' && capabilities.verification ? (
        <VerificationPanel campusId={campusId} />
      ) : null}
      {tab === 'ambassadors' && capabilities.ambassadors ? (
        <AmbassadorReviewPanel campusId={campusId} />
      ) : null}
      {tab === 'announcements' && capabilities.announcements ? (
        <AnnouncementsPanel campusId={campusId} />
      ) : null}
      {tab === 'safety' && capabilities.moderation ? (
        <SafetyPanel campusId={campusId} />
      ) : null}
      {tab === 'audit' && capabilities.audit ? <AuditPanel campusId={campusId} /> : null}

      <Text style={[styles.footnote, { color: theme.textSubtle }]}>
        Campus roles never grant platform administration, and never expose individual
        student records. Cohorts smaller than the privacy threshold are withheld rather
        than estimated.
      </Text>
    </AppScreen>
  );
}

function OverviewPanel({
  campusId,
  canExport
}: {
  campusId: string | null;
  canExport: boolean;
}) {
  const { theme } = useTheme();
  const overview = useCampusOverview(campusId);
  const exportCsv = useCampusAggregateExport(campusId);

  if (overview.isPending) return <ListCardSkeleton />;
  if (overview.isError || !overview.data) {
    return (
      <ErrorState
        icon="warning"
        title="Overview unavailable"
        message="The campus overview could not be loaded."
      />
    );
  }

  const { counts, privacy, reportTrends, range } = overview.data;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {format(new Date(range.start), 'MMM d')} – {format(new Date(range.end), 'MMM d')}
      </Text>
      <View style={styles.tileGrid}>
        {counts.activeUsersSuppressed ? (
          <MetricTile
            label="Active students"
            value={formatMetric(counts.activeUsers, true)}
            hint={`Fewer than ${privacy.minimumCohort}`}
          />
        ) : (
          <MetricTile
            label="Active students"
            value={formatMetric(counts.activeUsers, false)}
          />
        )}
        <MetricTile
          label="Organizations"
          value={counts.activeOrganizations.toLocaleString()}
        />
        <MetricTile
          label="Upcoming events"
          value={counts.upcomingEvents.toLocaleString()}
        />
        <MetricTile label="RSVPs" value={counts.rsvps.toLocaleString()} />
        <MetricTile label="Check-ins" value={counts.checkins.toLocaleString()} />
        <MetricTile label="No-shows" value={counts.noShows.toLocaleString()} />
        <MetricTile
          label="Repeat attendance"
          value={counts.repeatAttendance.toLocaleString()}
        />
        <MetricTile
          label="Verification queue"
          value={counts.verificationQueue.toLocaleString()}
        />
        <MetricTile
          label="Open moderation"
          value={counts.openModeration.toLocaleString()}
        />
        <MetricTile
          label="Safety escalations"
          value={counts.safetyEscalations.toLocaleString()}
        />
      </View>

      <InlineNotice
        tone="info"
        icon="safety"
        message={`Counts below ${privacy.minimumCohort} people are withheld so no individual can be identified.`}
      />

      {reportTrends.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Report trend</Text>
          {reportTrends.map((trend) => (
            <View key={trend.date} style={styles.rowBetween}>
              <Text style={[styles.rowLabel, { color: theme.textSubtle }]}>
                {format(new Date(trend.date), 'MMM d')}
              </Text>
              <Text style={[styles.rowValue, { color: theme.text }]}>
                {formatMetric(trend.count, trend.suppressed)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {canExport ? (
        <PrimaryButton
          label={exportCsv.isPending ? 'Preparing export…' : 'Export aggregate CSV'}
          variant="secondary"
          loading={exportCsv.isPending}
          accessibilityHint="Exports campus-level aggregate counts only. Individual records are never included."
          onPress={() => {
            exportCsv.mutate(
              { rangeStart: range.start, rangeEnd: range.end },
              {
                onSuccess: (csv) => {
                  const lines = csv.split('\n').length - 1;
                  Alert.alert(
                    'Export ready',
                    `${lines} aggregate row(s) prepared. This export was recorded in the campus audit log.`
                  );
                },
                onError: () =>
                  Alert.alert('Export failed', 'The export could not be prepared.')
              }
            );
          }}
        />
      ) : null}
    </View>
  );
}

function VerificationPanel({ campusId }: { campusId: string | null }) {
  const { theme } = useTheme();
  const queue = useCampusVerificationQueue(campusId, true);
  const review = useReviewVerification(campusId);
  const [notes, setNotes] = useState('');

  if (queue.isPending) return <ListCardSkeleton />;
  if (queue.isError) {
    return (
      <ErrorState
        icon="warning"
        title="Queue unavailable"
        message="The organization verification queue could not be loaded."
      />
    );
  }
  if ((queue.data?.length ?? 0) === 0) {
    return (
      <StatePanel
        icon="check"
        title="Verification queue is clear"
        message="No organizations are waiting on campus verification right now."
      />
    );
  }

  const notesValid = notes.trim().length >= 3;

  return (
    <View style={styles.section}>
      <TextField
        label="Review notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        help="Required. Recorded against the request and visible to platform administrators."
        placeholder="Officer roster confirmed against the registrar record."
      />
      {queue.data?.map((request) => (
        <View
          key={request.id}
          style={[styles.card, { backgroundColor: theme.surfaceMuted }]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {request.organizationName}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
            {request.requestKind} · submitted{' '}
            {format(new Date(request.submittedAt), 'MMM d, yyyy')}
          </Text>
          <View style={styles.actionRow}>
            <PrimaryButton
              label="Approve"
              disabled={!notesValid || review.isPending}
              accessibilityHint="Marks this organization verified for your campus."
              onPress={() =>
                review.mutate(
                  { requestId: request.id, approve: true, notes: notes.trim() },
                  {
                    onSuccess: () => setNotes(''),
                    onError: () =>
                      Alert.alert(
                        'Review failed',
                        'The verification review could not be saved.'
                      )
                  }
                )
              }
            />
            <PrimaryButton
              label="Decline"
              variant="secondary"
              disabled={!notesValid || review.isPending}
              onPress={() =>
                review.mutate(
                  { requestId: request.id, approve: false, notes: notes.trim() },
                  {
                    onSuccess: () => setNotes(''),
                    onError: () =>
                      Alert.alert(
                        'Review failed',
                        'The verification review could not be saved.'
                      )
                  }
                )
              }
            />
          </View>
        </View>
      ))}
      {!notesValid ? (
        <InlineNotice
          tone="info"
          message="Add review notes before approving or declining."
        />
      ) : null}
    </View>
  );
}

function AnnouncementsPanel({ campusId }: { campusId: string | null }) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const announcements = useCampusAnnouncements(campusId, true);
  const create = useCreateAnnouncement(campusId);
  const submit = useSubmitAnnouncement(campusId);
  const approve = useApproveAnnouncement(campusId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<CampusAnnouncementAudience>('all');

  const canSubmitDraft = title.trim().length >= 3 && body.trim().length >= 10;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>New announcement</Text>
      <TextField
        label="Title"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        placeholder="Welcome week hours"
      />
      <TextField
        label="Message"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={3000}
        placeholder="The student union extends its hours during welcome week."
      />
      <SegmentedControl
        accessibilityLabel="Announcement audience"
        value={audience}
        options={audiences}
        onChange={setAudience}
      />
      <PrimaryButton
        label="Save draft"
        disabled={!canSubmitDraft || create.isPending}
        loading={create.isPending}
        accessibilityHint="Saves a draft. A second approver must schedule it before students see it."
        onPress={() =>
          create.mutate(
            { title: title.trim(), body: body.trim(), audience },
            {
              onSuccess: () => {
                setTitle('');
                setBody('');
              },
              onError: () =>
                Alert.alert('Draft failed', 'The announcement draft could not be saved.')
            }
          )
        }
      />

      <InlineNotice
        tone="info"
        icon="safety"
        message="Announcements require a second approver. You cannot approve an announcement you wrote."
      />

      {announcements.isPending ? <ListCardSkeleton /> : null}
      {announcements.data?.map((announcement) => {
        const isOwnDraft = announcement.authorId === profile?.id;
        return (
          <View
            key={announcement.id}
            style={[styles.card, { backgroundColor: theme.surfaceMuted }]}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {announcement.title}
              </Text>
              <StatusPill
                label={announcement.status.replace(/_/g, ' ')}
                tone={announcement.status === 'published' ? 'success' : 'neutral'}
              />
            </View>
            <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
              {announcement.audience} · created{' '}
              {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
            </Text>
            {announcement.status === 'draft' ? (
              <PrimaryButton
                label="Submit for approval"
                variant="secondary"
                disabled={submit.isPending}
                onPress={() =>
                  submit.mutate(announcement.id, {
                    onError: () =>
                      Alert.alert(
                        'Submission failed',
                        'Only the author can submit this draft.'
                      )
                  })
                }
              />
            ) : null}
            {announcement.status === 'pending_approval' && !isOwnDraft ? (
              <PrimaryButton
                label="Approve and schedule"
                disabled={approve.isPending}
                accessibilityHint="Schedules the announcement to publish in one hour for seven days."
                onPress={() => {
                  const publishAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                  const expireAt = new Date(
                    Date.now() + 8 * 24 * 60 * 60 * 1000
                  ).toISOString();
                  approve.mutate(
                    {
                      announcementId: announcement.id,
                      publishAt,
                      expireAt,
                      approve: true
                    },
                    {
                      onError: () =>
                        Alert.alert(
                          'Approval failed',
                          'An announcement must be approved by someone other than its author.'
                        )
                    }
                  );
                }}
              />
            ) : null}
            {announcement.status === 'pending_approval' && isOwnDraft ? (
              <InlineNotice
                tone="info"
                message="Awaiting a second approver. You cannot approve your own announcement."
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function SafetyPanel({ campusId }: { campusId: string | null }) {
  const { theme } = useTheme();
  const escalations = useCampusSafetyEscalations(campusId, true);
  const resolve = useResolveEscalation(campusId);
  const [note, setNote] = useState('');

  if (escalations.isPending) return <ListCardSkeleton />;
  if (escalations.isError) {
    return (
      <ErrorState
        icon="warning"
        title="Escalations unavailable"
        message="Campus safety escalations could not be loaded."
      />
    );
  }

  const open = escalations.data?.filter((entry) => entry.resolvedAt === null) ?? [];

  if (open.length === 0) {
    return (
      <StatePanel
        icon="check"
        title="No open escalations"
        message="No moderation cases are currently escalated to campus safety."
      />
    );
  }

  const noteValid = note.trim().length >= 10;

  return (
    <View style={styles.section}>
      <TextField
        label="Resolution note"
        value={note}
        onChangeText={setNote}
        multiline
        help="Required. At least 10 characters, recorded in the campus audit log."
      />
      {open.map((escalation) => (
        <View
          key={escalation.id}
          style={[styles.card, { backgroundColor: theme.surfaceMuted }]}
        >
          <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
            Escalated {format(new Date(escalation.createdAt), 'MMM d, yyyy')}
          </Text>
          <Text style={[styles.cardBody, { color: theme.text }]}>
            {escalation.reason}
          </Text>
          <PrimaryButton
            label="Mark resolved"
            disabled={!noteValid || resolve.isPending}
            onPress={() =>
              resolve.mutate(
                { escalationId: escalation.id, note: note.trim() },
                {
                  onSuccess: () => setNote(''),
                  onError: () =>
                    Alert.alert('Resolve failed', 'The escalation could not be resolved.')
                }
              )
            }
          />
        </View>
      ))}
    </View>
  );
}

function AmbassadorReviewPanel({ campusId }: { campusId: string | null }) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const applications = useAmbassadorApplications(campusId, true);
  const review = useReviewAmbassadorApplication(campusId);
  const [notes, setNotes] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  if (applications.isPending) return <ListCardSkeleton />;
  if (applications.isError) {
    return (
      <ErrorState
        icon="warning"
        title="Applications unavailable"
        message="Ambassador applications could not be loaded."
      />
    );
  }
  if ((applications.data?.length ?? 0) === 0) {
    return (
      <StatePanel
        icon="check"
        title="No applications waiting"
        message="No students are currently waiting on an ambassador decision."
      />
    );
  }

  const notesValid = notes.trim().length >= 3;

  return (
    <View style={styles.section}>
      <TextField
        label="Review notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        help="Required. Recorded against the decision in the campus audit log."
        placeholder="Confirmed as an active organization officer."
      />

      {applications.data?.map((application) => {
        const isOwnApplication = application.profileId === profile?.id;
        const isOpen = openId === application.id;
        return (
          <View
            key={application.id}
            style={[styles.card, { backgroundColor: theme.surfaceMuted }]}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {application.displayName ?? 'Ruckus member'}
              </Text>
              <StatusPill label={application.status.replace(/_/g, ' ')} tone="neutral" />
            </View>
            <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
              Applied {format(new Date(application.createdAt), 'MMM d, yyyy')}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${isOpen ? 'Hide' : 'Show'} application details`}
              onPress={() => setOpenId(isOpen ? null : application.id)}
            >
              <Text style={[styles.cardMeta, { color: theme.primary }]}>
                {isOpen ? 'Hide application' : 'Read application'}
              </Text>
            </Pressable>
            {isOpen ? (
              <Text style={[styles.cardBody, { color: theme.text }]}>
                {application.motivation}
              </Text>
            ) : null}

            {isOwnApplication ? (
              <InlineNotice
                tone="info"
                icon="safety"
                message="This is your own application. Another campus administrator must decide it."
              />
            ) : (
              <View style={styles.actionRow}>
                <PrimaryButton
                  label="Approve"
                  disabled={!notesValid || review.isPending}
                  accessibilityHint="Activates this student as a campus ambassador and issues their referral code."
                  onPress={() =>
                    review.mutate(
                      {
                        applicationId: application.id,
                        approve: true,
                        notes: notes.trim()
                      },
                      {
                        onSuccess: () => setNotes(''),
                        onError: () =>
                          Alert.alert(
                            'Review failed',
                            'The ambassador decision could not be saved.'
                          )
                      }
                    )
                  }
                />
                <PrimaryButton
                  label="Decline"
                  variant="secondary"
                  disabled={!notesValid || review.isPending}
                  onPress={() =>
                    review.mutate(
                      {
                        applicationId: application.id,
                        approve: false,
                        notes: notes.trim()
                      },
                      {
                        onSuccess: () => setNotes(''),
                        onError: () =>
                          Alert.alert(
                            'Review failed',
                            'The ambassador decision could not be saved.'
                          )
                      }
                    )
                  }
                />
              </View>
            )}
          </View>
        );
      })}

      {!notesValid ? (
        <InlineNotice
          tone="info"
          message="Add review notes before approving or declining an application."
        />
      ) : null}
    </View>
  );
}

function AuditPanel({ campusId }: { campusId: string | null }) {
  const { theme } = useTheme();
  const audit = useCampusAuditLog(campusId, true);

  if (audit.isPending) return <ListCardSkeleton />;
  if (audit.isError) {
    return (
      <ErrorState
        icon="warning"
        title="Audit log unavailable"
        message="The campus audit log could not be loaded."
      />
    );
  }
  if ((audit.data?.length ?? 0) === 0) {
    return (
      <StatePanel
        icon="info"
        title="No audit entries yet"
        message="Campus administration actions will appear here as they happen."
      />
    );
  }

  return (
    <View style={styles.section}>
      {audit.data?.map((entry) => (
        <View key={entry.id} style={styles.rowBetween}>
          <View style={styles.auditText}>
            <Text style={[styles.rowValue, { color: theme.text }]}>
              {entry.action.replace(/_/g, ' ')}
            </Text>
            <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
              {entry.targetType}
            </Text>
          </View>
          <Text style={[styles.rowLabel, { color: theme.textSubtle }]}>
            {format(new Date(entry.createdAt), 'MMM d, HH:mm')}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space.md, marginTop: tokens.space.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  campusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginBottom: tokens.space.md
  },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  tile: {
    minWidth: 104,
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: 2
  },
  tileValue: { fontSize: 20, fontWeight: '700' },
  tileLabel: { fontSize: 12 },
  tileHint: { fontSize: 11, fontStyle: 'italic' },
  card: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.sm
  },
  cardTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  cardMeta: { fontSize: 12 },
  cardBody: { fontSize: 14, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: tokens.space.sm, flexWrap: 'wrap' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
    paddingVertical: 6
  },
  rowLabel: { fontSize: 12 },
  rowValue: { fontSize: 14, fontWeight: '600' },
  auditText: { flexShrink: 1, gap: 2 },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: tokens.space.lg }
});
