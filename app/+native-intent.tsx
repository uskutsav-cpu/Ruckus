import { safeDeepLinkPath } from '@/lib/deep-link';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return safeDeepLinkPath(path);
}
