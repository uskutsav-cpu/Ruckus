import type { StatePanelProps } from '@/components/ui/state-panel';
import { StatePanel } from '@/components/ui/state-panel';

export function ErrorState(props: StatePanelProps) {
  return <StatePanel eyebrow="Quick timeout" {...props} />;
}
