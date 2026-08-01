/** Stable aliases over the mechanically generated Supabase schema. */
import type { Database, Json, Tables } from '@/types/database.generated';

export type { Database, Json } from '@/types/database.generated';

export type ProfileRow = Tables<'profiles'>;
export type InterestRow = Tables<'interests'>;
export type ActivityFeedRow = Tables<'activity_feed'>;
export type MessageRow = Tables<'messages'>;
export type EventRow = Tables<'events'>;
export type EventRsvpRow = Tables<'event_rsvps'>;
export type EventMessageRow = Tables<'event_messages'>;
export type OrganizationRow = Tables<'organizations'>;
export type ProfilePreferencesRow = Tables<'profile_preferences'>;

export type UserRole = Database['public']['Enums']['user_role'];
export type GroupStatus = Database['public']['Enums']['group_status'];
export type MessageKind = Database['public']['Enums']['message_kind'];
export type ConfirmationStatus = Database['public']['Enums']['confirmation_status'];
export type XpReason = Database['public']['Enums']['xp_reason'];
export type EventStatus = Database['public']['Enums']['event_status'];
export type EventVisibility = Database['public']['Enums']['event_visibility'];
export type RsvpStatus = Database['public']['Enums']['rsvp_status'];
export type EventMessageKind = Database['public']['Enums']['event_message_kind'];
export type OrganizationRole = Database['public']['Enums']['organization_role'];
export type ModerationCaseStatus = Database['public']['Enums']['moderation_case_status'];
export type ModerationActionKind = Database['public']['Enums']['moderation_action_kind'];

export type DatabaseJson = Json;
