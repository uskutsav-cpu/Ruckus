import { z } from 'zod';

import type {
  ModerationActionInput,
  ModerationFilters,
  ModerationQueue
} from '@/features/moderation/moderation-types';
import { requireSupabase } from '@/lib/supabase';
import type { ModerationCaseStatus } from '@/types/database';

const caseStatusSchema = z.enum(['open', 'under_review', 'resolved', 'dismissed']);
const queueSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      reportId: z.string().uuid(),
      status: caseStatusSchema,
      severity: z.number().int().min(1).max(4),
      assignedTo: z.string().uuid().nullable(),
      resolutionNotes: z.string().nullable(),
      createdAt: z.string(),
      targetType: z.enum(['user', 'message', 'group', 'event', 'organization']),
      targetId: z.string().uuid(),
      targetLabel: z.string(),
      reason: z.string(),
      details: z.string().nullable(),
      reporterId: z.string().uuid(),
      priorActionCount: z.coerce.number().int().nonnegative()
    })
  ),
  total: z.coerce.number().int().nonnegative()
});

export async function fetchModerationQueue(
  filters: ModerationFilters,
  isDemo: boolean
): Promise<ModerationQueue> {
  if (isDemo) return { items: [], total: 0 };
  const { data, error } = await requireSupabase().rpc('get_moderation_queue', {
    ...(filters.status ? { status_filter: filters.status } : {}),
    ...(filters.severity ? { severity_filter: filters.severity } : {}),
    ...(filters.search.trim() ? { search_text: filters.search.trim() } : {}),
    page_size: filters.pageSize,
    page_offset: filters.page * filters.pageSize
  });
  if (error) throw error;
  return queueSchema.parse(data) as ModerationQueue;
}

export async function updateModerationCase(
  input: {
    caseId: string;
    status: ModerationCaseStatus;
    severity: number;
    notes: string;
  },
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('update_moderation_case', {
    target_case_id: input.caseId,
    next_status: input.status,
    severity_value: input.severity,
    ...(input.notes.trim() ? { notes: input.notes.trim() } : {})
  });
  if (error) throw error;
}

export async function applyModerationAction(
  input: ModerationActionInput,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('apply_moderation_action', {
    target_case_id: input.caseId,
    action_value: input.action,
    action_reason: input.reason.trim(),
    ...(input.expiration ? { expiration: input.expiration } : {})
  });
  if (error) throw error;
}
