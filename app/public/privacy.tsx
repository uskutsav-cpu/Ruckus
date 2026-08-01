import { DocumentSection, PublicDocument } from '@/components/public/public-document';

export default function PrivacyPage() {
  return (
    <PublicDocument
      eyebrow="Draft policy · August 2026"
      title="Privacy Policy"
      subtitle="A plain-language draft describing the beta data model and privacy choices."
      legalDraft
    >
      <DocumentSection title="What the beta collects">
        Account and verified campus-email state, profile details you provide, event and
        RSVP activity, organization roles, messages, reports, blocks, check-ins,
        notification preferences, and limited operational logs. Ruckus does not request
        contact lists, background location, advertising identifiers, or continuous precise
        location.
      </DocumentSection>
      <DocumentSection title="How data is used">
        Data supports authentication, campus eligibility, discovery, capacity and
        waitlists, private event chat, organizer operations, safety moderation, verified
        attendance, and reliable service operation. Message bodies and private report
        descriptions are not product-analytics fields.
      </DocumentSection>
      <DocumentSection title="Visibility">
        Public event pages show event details and organizer identity but not attendee
        lists, chat, or private coordinates. Exact coordinates can remain hidden until
        confirmation. Organization contact email and officer records are restricted to
        authorized roles.
      </DocumentSection>
      <DocumentSection title="Processors and storage">
        The beta architecture uses Supabase for authentication, database, storage,
        realtime, and server functions; Expo services may be used for app builds and push
        delivery. Optional error-reporting integrations remain disabled without
        owner-provided configuration.
      </DocumentSection>
      <DocumentSection title="Your choices">
        You can change notification and leaderboard preferences, request a data export,
        block users, request account deletion in the app, and use the web deletion
        instructions. Deletion is idempotent and may retain narrowly required security or
        legal records under a documented retention policy.
      </DocumentSection>
      <DocumentSection title="Contact">
        A verified production privacy contact and jurisdiction-specific rights language
        are owner/legal launch gates. Until configured, use the Support page; do not send
        sensitive identity documents.
      </DocumentSection>
    </PublicDocument>
  );
}
