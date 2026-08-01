import { DocumentSection, PublicDocument } from '@/components/public/public-document';

export default function TermsPage() {
  return (
    <PublicDocument
      eyebrow="Draft agreement · August 2026"
      title="Terms of Use"
      subtitle="A product-readiness draft for the 18+ Ruckus beta."
      legalDraft
    >
      <DocumentSection title="Eligibility and accounts">
        The initial beta is for people age 18 or older with an eligible verified campus
        email. Provide accurate information, protect your credentials, and use one
        persistent account.
      </DocumentSection>
      <DocumentSection title="User-generated content">
        You are responsible for events, organization profiles, messages, images, and other
        content you submit. You must have permission to represent an organization and
        rights to the content you upload.
      </DocumentSection>
      <DocumentSection title="Conduct and moderation">
        The Community Guidelines are part of these terms. Ruckus may investigate reports,
        remove content, cancel events, restrict organizations, or suspend accounts to
        operate and protect the service.
      </DocumentSection>
      <DocumentSection title="Events and risk">
        Events are generally organized by users or clubs, not by Ruckus. Ruckus does not
        perform background checks or guarantee event accuracy, accessibility, legality,
        attendance, or safety. Use judgment and contact emergency services for immediate
        danger.
      </DocumentSection>
      <DocumentSection title="Payments">
        Ruckus does not process event payments in this beta. Cost information is
        descriptive and must not be treated as a Ruckus ticket or refund guarantee.
      </DocumentSection>
      <DocumentSection title="Launch gate">
        Governing law, dispute terms, warranty limitations, verified business identity,
        and a production legal contact require owner and qualified-counsel approval before
        launch.
      </DocumentSection>
    </PublicDocument>
  );
}
