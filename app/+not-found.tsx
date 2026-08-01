import { router } from 'expo-router';

import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { AppScreen } from '@/components/ui/app-screen';
import { ErrorState } from '@/components/ui/error-state';

export default function NotFoundScreen() {
  return (
    <AppScreen contentStyle={{ paddingTop: 0 }}>
      <PublicHeader />
      <ErrorState
        icon="discover"
        title="That link does not go anywhere"
        message="The page may have moved, or the link may be invalid. No private content was opened."
        actionLabel="Go to Ruckus"
        onAction={() => router.replace('/public')}
      />
      <PublicFooter />
    </AppScreen>
  );
}
