import type { StatePanelProps } from '@/components/ui/state-panel';
import { StatePanel } from '@/components/ui/state-panel';

export function EmptyState(props: StatePanelProps) {
  return <StatePanel eyebrow="You’re caught up" {...props} />;
}
