import { router } from 'expo-router';

import { DocumentSection, PublicDocument } from '@/components/public/public-document';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { useAuth } from '@/providers/auth-provider';

export default function PublicAccountDeletionPage() {
  const { user } = useAuth();
  return (
    <PublicDocument
      eyebrow="Privacy request"
      title="Delete your Ruckus account"
      subtitle="The authenticated flow protects your account from unauthorized deletion requests."
    >
      <DocumentSection title="In the app">
        Sign in, open Profile → Settings → Delete account, review the consequences, and
        confirm. The request is idempotent, signs the account out, and places the profile
        in a pending deletion state while the cleanup job removes eligible data.
      </DocumentSection>
      <DocumentSection title="If you cannot sign in">
        Use password recovery first so the request can be authenticated. If recovery is
        impossible, use the verified production support contact once configured. Ruckus
        will need to verify account ownership without asking for your password.
      </DocumentSection>
      <DocumentSection title="Retention limits">
        Some fraud-prevention, moderation, security, or legally required records may be
        retained for a limited documented period. Public event or chat content is removed
        or de-identified according to the data-retention policy.
      </DocumentSection>
      <InlineNotice message="This page does not accept an unauthenticated email-only deletion request because that could be used to target someone else’s account." />
      <PrimaryButton
        label={user ? 'Open deletion settings' : 'Sign in to continue'}
        onPress={() => router.push(user ? '/account-deletion' : '/sign-in')}
      />
      <SecondaryButton label="Support" onPress={() => router.push('/public/support')} />
    </PublicDocument>
  );
}
