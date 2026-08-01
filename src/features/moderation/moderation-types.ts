import type { ModerationActionKind, ModerationCaseStatus } from '@/types/database';

export type ModerationQueueItem = {
  id: string;
  reportId: string;
  status: ModerationCaseStatus;
  severity: number;
  assignedTo: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  targetType: 'user' | 'message' | 'group' | 'event' | 'organization';
  targetId: string;
  targetLabel: string;
  reason: string;
  details: string | null;
  reporterId: string;
  priorActionCount: number;
};

export type ModerationQueue = {
  items: ModerationQueueItem[];
  total: number;
};

export type ModerationFilters = {
  status: ModerationCaseStatus | null;
  severity: number | null;
  search: string;
  page: number;
  pageSize: number;
};

export type ModerationActionInput = {
  caseId: string;
  action: ModerationActionKind;
  reason: string;
  expiration?: string;
};
