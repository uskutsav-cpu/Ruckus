import { demoEvents } from '@/features/events/demo-events';
import { requireSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.generated';

export type PublicEvent = Tables<'public_event_pages'>;
export type PublicOrganization = Tables<'public_organization_profiles'>;

function demoPublicEvent(slug: string): PublicEvent | null {
  const event = demoEvents.find(
    (candidate) => candidate.slug === slug && candidate.visibility === 'public'
  );
  if (!event) return null;
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    category: event.category,
    cover_image_path: event.coverImagePath,
    campus_id: event.campusId,
    campus_name: event.campusName,
    organization_id: event.organizationId,
    organization_name: event.organizationName,
    organization_verified: event.organizationVerified,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    timezone: event.timezone,
    venue_name: event.venueName,
    location_description: event.locationDescription,
    capacity: event.capacity,
    waitlist_enabled: event.waitlistEnabled,
    approval_required: event.approvalRequired,
    accessibility_information: event.accessibilityInformation,
    cost_information: event.costInformation,
    cancellation_policy: event.cancellationPolicy,
    status: 'published',
    cancellation_reason: null
  };
}

const demoOrganization: PublicOrganization = {
  id: '60000000-0000-4000-8000-000000000001',
  slug: 'demo-campus-outdoors',
  name: 'Campus Outdoors Club',
  description:
    'A demo organization for local development. No real partnership or university endorsement is implied.',
  logo_path: null,
  banner_path: null,
  website_url: null,
  social_links: {},
  is_verified: false,
  campus_id: '00000000-0000-4000-8000-000000000001',
  campus_name: 'Demo State University'
};

export async function fetchPublicEvent(
  slug: string,
  isDemo: boolean
): Promise<PublicEvent | null> {
  if (isDemo) return demoPublicEvent(slug);
  const { data, error } = await requireSupabase()
    .from('public_event_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPublicOrganization(
  slug: string,
  isDemo: boolean
): Promise<{ organization: PublicOrganization; events: PublicEvent[] } | null> {
  if (isDemo) {
    if (slug !== demoOrganization.slug && slug !== 'campus-outdoors-club') return null;
    return {
      organization: demoOrganization,
      events: demoEvents
        .filter(
          (event) =>
            event.organizationId === demoOrganization.id && event.visibility === 'public'
        )
        .map((event) => demoPublicEvent(event.slug)!)
    };
  }
  const supabase = requireSupabase();
  const { data: organization, error } = await supabase
    .from('public_organization_profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!organization?.id) return null;
  const { data: events, error: eventsError } = await supabase
    .from('public_event_pages')
    .select('*')
    .eq('organization_id', organization.id)
    .order('starts_at', { ascending: true });
  if (eventsError) throw eventsError;
  return { organization, events: events ?? [] };
}

export async function submitPartnershipLead(
  input: {
    campusName: string;
    organizationName: string;
    contactName: string;
    contactEmail: string;
    leadType: string;
    message: string;
    website: string;
  },
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().functions.invoke('partnership-lead', {
    body: input
  });
  if (error) throw error;
}
