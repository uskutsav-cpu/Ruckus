import { router } from 'expo-router';

import { DocumentSection, PublicDocument } from '@/components/public/public-document';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { useAuth } from '@/providers/auth-provider';

export default function SupportPage() {
  const { user } = useAuth();
  return (
    <PublicDocument
      eyebrow="Help and safety"
      title="Support"
      subtitle="Account, event, privacy, and moderation help for the Ruckus beta."
    >
      <InlineNotice
        tone="error"
        icon="warning"
        message="Ruckus is not an emergency service. For immediate danger, use verified local emergency services. No emergency number is configured in this beta repository."
      />
      <DocumentSection title="Report content in context">
        Signed-in users can report an event, organization, user, or message from its
        screen. Reports preserve relevant evidence references and do not reveal reporter
        identity to the reported person.
      </DocumentSection>
      <DocumentSection title="Account and privacy requests">
        Use Settings for data export, blocking, notification preferences, and account
        deletion. The web account-deletion page explains how to continue when you cannot
        access the app.
      </DocumentSection>
      <DocumentSection title="Appeals and unresolved issues">
        A production support address is an owner-configured launch gate. Until that
        verified contact exists, this public repository must not invent one. Record the
        issue securely and avoid placing passwords, tokens, government IDs, or medical
        details in messages.
      </DocumentSection>
      <PrimaryButton
        label={user ? 'Open Safety Center' : 'Sign in'}
        onPress={() => router.push(user ? '/safety' : '/sign-in')}
      />
      <SecondaryButton
        label="Account deletion help"
        onPress={() => router.push('/public/account-deletion')}
      />
    </PublicDocument>
  );
}
