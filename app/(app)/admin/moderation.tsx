import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import type {
  ModerationActionInput,
  ModerationFilters,
  ModerationQueueItem
} from '@/features/moderation/moderation-types';
import {
  useApplyModerationAction,
  useModerationQueue,
  useUpdateModerationCase
} from '@/features/moderation/use-moderation';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';
import type { ModerationActionKind, ModerationCaseStatus } from '@/types/database';

const statuses: { value: ModerationCaseStatus | null; label: string }[] = [
  { value: null, label: 'Active + closed' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' }
];

const pageSize = 20;

export default function ModerationScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [status, setStatus] = useState<ModerationCaseStatus | null>('open');
  const [severity, setSeverity] = useState<number | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const filters = useMemo<ModerationFilters>(
    () => ({ status, severity, search, page, pageSize }),
    [page, search, severity, status]
  );
  const queue = useModerationQueue(filters);

  if (profile?.role !== 'admin') {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="lock"
          title="Admin access required"
          message="Moderation reports are private and available only to authorized reviewers."
        />
      </AppScreen>
    );
  }

  const total = queue.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppScreen
      eyebrow="Restricted operations"
      title="Moderation queue"
      subtitle="Review private reports, record decisions, and apply only proportionate actions. Every enforcement action is audited."
    >
      <BackButton />
      <InlineNotice
        tone="info"
        message="Handle report details as sensitive data. For immediate danger, follow the emergency escalation runbook outside this queue."
      />
      <TextField
        label="Search reports"
        value={searchDraft}
        onChangeText={setSearchDraft}
        placeholder="Reason or report context"
        returnKeyType="search"
        onSubmitEditing={() => {
          setPage(0);
          setSearch(searchDraft);
        }}
      />
      <PrimaryButton
        label="Apply search"
        variant="secondary"
        onPress={() => {
          setPage(0);
          setSearch(searchDraft);
        }}
      />

      <Text style={[styles.filterLabel, { color: theme.text }]}>Status</Text>
      <View style={styles.chips}>
        {statuses.map((option) => (
          <FilterChip
            key={option.label}
            label={option.label}
            active={status === option.value}
            onPress={() => {
              setPage(0);
              setStatus(option.value);
            }}
          />
        ))}
      </View>
      <Text style={[styles.filterLabel, { color: theme.text }]}>Severity</Text>
      <View style={styles.chips}>
        {[null, 4, 3, 2, 1].map((value) => (
          <FilterChip
            key={value ?? 'all'}
            label={value ? `S${value}` : 'All'}
            active={severity === value}
            onPress={() => {
              setPage(0);
              setSeverity(value);
            }}
          />
        ))}
      </View>

      <View style={styles.summaryRow}>
        <Text style={[styles.summary, { color: theme.textMuted }]}>
          Restricted results
        </Text>
        <Text style={[styles.summary, { color: theme.text }]}>{total} cases</Text>
      </View>
      {queue.isLoading ? (
        <ListCardSkeleton count={3} />
      ) : queue.isError ? (
        <ErrorState
          icon="↻"
          title="Queue unavailable"
          message="No moderation decision was changed. Try loading the restricted queue again."
          actionLabel="Try again"
          onAction={() => void queue.refetch()}
        />
      ) : queue.data?.items.length ? (
        <View style={styles.cases}>
          {queue.data.items.map((item) => (
            <ModerationCaseCard key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <InlineNotice message="No cases match these filters." />
      )}

      <View style={styles.pagination}>
        <PrimaryButton
          label="Previous"
          variant="secondary"
          disabled={page === 0}
          onPress={() => setPage((current) => Math.max(0, current - 1))}
          style={styles.pageButton}
        />
        <Text style={[styles.pageLabel, { color: theme.textMuted }]}>
          Page {page + 1} of {pageCount}
        </Text>
        <PrimaryButton
          label="Next"
          variant="secondary"
          disabled={page + 1 >= pageCount}
          onPress={() => setPage((current) => current + 1)}
          style={styles.pageButton}
        />
      </View>
    </AppScreen>
  );
}

function ModerationCaseCard({ item }: { item: ModerationQueueItem }) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(item.resolutionNotes ?? '');
  const [actionClock] = useState(() => Date.now());
  const updateCase = useUpdateModerationCase();
  const applyAction = useApplyModerationAction();
  const actionOptions = availableActions(item);
  const busy = updateCase.isPending || applyAction.isPending;

  const update = (nextStatus: ModerationCaseStatus) => {
    updateCase.mutate({
      caseId: item.id,
      status: nextStatus,
      severity: item.severity,
      notes
    });
  };
  const apply = (action: ModerationActionKind) => {
    if (notes.trim().length < 3) {
      Alert.alert(
        'Add decision notes',
        'Record at least three characters before enforcement.'
      );
      return;
    }
    const input: ModerationActionInput = {
      caseId: item.id,
      action,
      reason: notes.trim(),
      ...(action === 'suspend_user'
        ? { expiration: new Date(actionClock + 7 * 24 * 60 * 60_000).toISOString() }
        : {})
    };
    Alert.alert(
      'Confirm audited action',
      `${actionLabel(action)} will be recorded with your admin identity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel(action),
          style: action === 'warn_user' ? 'default' : 'destructive',
          onPress: () => applyAction.mutate(input)
        }
      ]
    );
  };

  return (
    <View
      style={[
        styles.caseCard,
        { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.reason}, severity ${item.severity}`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
      >
        <View style={styles.caseTop}>
          <StatusPill
            label={`S${item.severity}`}
            tone={item.severity >= 3 ? 'warning' : 'neutral'}
          />
          <StatusPill
            label={item.status.replace('_', ' ')}
            tone={item.status === 'resolved' ? 'success' : 'accent'}
          />
          {item.priorActionCount ? (
            <StatusPill label={`${item.priorActionCount} prior actions`} tone="warning" />
          ) : null}
        </View>
        <Text style={[styles.caseTitle, { color: theme.text }]}>{item.reason}</Text>
        <Text style={[styles.caseMeta, { color: theme.textMuted }]}>
          {item.targetType} · {item.targetLabel} ·{' '}
          {formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: true })}
        </Text>
        {item.details ? (
          <Text
            numberOfLines={expanded ? undefined : 2}
            style={[styles.details, { color: theme.textMuted }]}
          >
            {item.details}
          </Text>
        ) : null}
        <Text style={[styles.expand, { color: theme.accent }]}>
          {expanded ? 'Hide controls' : 'Review case'}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={[styles.controls, { borderTopColor: theme.border }]}>
          <TextField
            label="Private decision notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={4000}
            help="Required for enforcement; visible only to authorized reviewers."
          />
          {updateCase.isError || applyAction.isError ? (
            <InlineNotice
              tone="error"
              message="The case was not changed. Check authorization and try again."
            />
          ) : null}
          <View style={styles.controlButtons}>
            {item.status === 'open' ? (
              <PrimaryButton
                label="Assign to me"
                variant="secondary"
                loading={updateCase.isPending}
                disabled={busy}
                onPress={() => update('under_review')}
              />
            ) : null}
            {item.status !== 'dismissed' && item.status !== 'resolved' ? (
              <PrimaryButton
                label="Dismiss report"
                variant="ghost"
                disabled={busy}
                onPress={() => update('dismissed')}
              />
            ) : null}
            {actionOptions.map((action) => (
              <PrimaryButton
                key={action}
                label={actionLabel(action)}
                variant={action === 'warn_user' ? 'secondary' : 'danger'}
                disabled={
                  busy || item.status === 'resolved' || item.status === 'dismissed'
                }
                loading={applyAction.isPending}
                onPress={() => apply(action)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function availableActions(item: ModerationQueueItem): ModerationActionKind[] {
  if (item.targetType === 'user') return ['warn_user', 'suspend_user', 'ban_user'];
  if (item.targetType === 'message')
    return ['warn_user', 'remove_content', 'suspend_user', 'ban_user'];
  if (item.targetType === 'event') return ['remove_content', 'cancel_event'];
  if (item.targetType === 'organization') return ['restrict_organization'];
  return [];
}

function actionLabel(action: ModerationActionKind): string {
  const labels: Record<ModerationActionKind, string> = {
    warn_user: 'Record warning',
    suspend_user: 'Suspend 7 days',
    ban_user: 'Ban user',
    remove_content: 'Remove content',
    restrict_organization: 'Restrict organization',
    cancel_event: 'Cancel event',
    restore_content: 'Restore content'
  };
  return labels[action];
}

function FilterChip({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accentMuted : theme.surfaceElevated,
          borderColor: active ? theme.accent : theme.border
        }
      ]}
    >
      <Text style={[styles.chipText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterLabel: {
    marginTop: tokens.space.lg,
    marginBottom: tokens.space.sm,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  chip: {
    minHeight: tokens.touchTarget,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.md
  },
  chipText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.medium },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: tokens.space.xl,
    marginBottom: tokens.space.md
  },
  summary: { fontSize: tokens.type.caption, fontWeight: tokens.weight.medium },
  cases: { gap: tokens.space.md },
  caseCard: { borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md },
  caseTop: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  caseTitle: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold
  },
  caseMeta: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  details: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.label,
    lineHeight: tokens.lineHeight.body
  },
  expand: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.bold
  },
  controls: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: tokens.space.md,
    paddingTop: tokens.space.md
  },
  controlButtons: { gap: tokens.space.sm },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
    marginTop: tokens.space.xl
  },
  pageButton: { flex: 1 },
  pageLabel: { fontSize: tokens.type.caption, textAlign: 'center' }
});
