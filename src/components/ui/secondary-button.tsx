import type { PrimaryButtonProps } from '@/components/ui/primary-button';
import { PrimaryButton } from '@/components/ui/primary-button';

export function SecondaryButton(props: Omit<PrimaryButtonProps, 'variant'>) {
  return <PrimaryButton {...props} variant="secondary" />;
}
