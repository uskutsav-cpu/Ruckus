import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/providers/auth-provider';

export default function IndexRoute() {
  const { isLoading, profile, user } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/welcome" />;
  if (!profile?.age_attested || !profile.safety_acknowledged_at) {
    return <Redirect href="/age-and-safety" />;
  }
  if (!profile.onboarding_completed_at) return <Redirect href="/onboarding" />;
  return <Redirect href="/discover" />;
}
