import { router } from 'expo-router';
import { useEffect } from 'react';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/providers/auth-provider';

export default function AuthCallbackScreen() {
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading) router.replace(user ? '/' : '/sign-in');
  }, [isLoading, user]);

  return <LoadingScreen label="Verifying your campus email…" />;
}
