import { DocumentSection, PublicDocument } from '@/components/public/public-document';

export default function CommunityGuidelinesPage() {
  return (
    <PublicDocument
      eyebrow="Community standards"
      title="Community Guidelines"
      subtitle="Ruckus is for real campus activity, organized with persistent identities and practical safety tools."
    >
      <DocumentSection title="Respect people and consent">
        Harassment, threats, stalking, hate, sexual exploitation, non-consensual imagery,
        coercion, and targeted abuse are prohibited. Respect boundaries in events, chats,
        profiles, and direct interactions.
      </DocumentSection>
      <DocumentSection title="Keep events truthful">
        Do not impersonate a club, misrepresent university approval, fabricate attendance,
        conceal material costs, promote dangerous activity, or publish private locations
        in a way that puts people at risk.
      </DocumentSection>
      <DocumentSection title="No spam or illegal content">
        Do not use Ruckus for scams, repetitive promotion, malicious links, prohibited
        goods, instructions for wrongdoing, or content that violates another person’s
        rights.
      </DocumentSection>
      <DocumentSection title="Report and block">
        Report users, events, organizations, and messages from their relevant screens.
        Blocking has an immediate local effect and persists to the account. Reports are
        reviewed without revealing the reporter to the reported user.
      </DocumentSection>
      <DocumentSection title="Safety limits">
        Ruckus does not conduct background checks, supervise events, or guarantee personal
        safety. For immediate danger, contact verified local emergency services directly.
      </DocumentSection>
      <DocumentSection title="Enforcement">
        Ruckus may warn, suspend, ban, remove content, cancel events, or restrict
        organizations. Appeals and support requests use the Support page. The beta is
        limited to people age 18 or older.
      </DocumentSection>
    </PublicDocument>
  );
}
