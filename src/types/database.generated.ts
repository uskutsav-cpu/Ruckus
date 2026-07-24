/**
 * Schema-derived Supabase types.
 *
 * Regenerate against a running local stack after every migration:
 * `npm run db:types`
 */
export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'student' | 'host' | 'admin';
export type SessionStatus = 'scheduled' | 'cancelled' | 'completed';
export type SwipeDecision = 'pass' | 'interested';
export type WaitlistStatus = 'waiting' | 'matched' | 'withdrawn' | 'expired';
export type GroupStatus =
  'forming' | 'pending_confirmation' | 'confirmed' | 'cancelled' | 'completed';
export type GroupMemberStatus = 'invited' | 'active' | 'left' | 'removed';
export type MessageKind = 'text' | 'system';
export type ConfirmationStatus = 'pending' | 'confirmed' | 'declined' | 'expired';
export type XpReason =
  | 'attendance_confirmed'
  | 'verified_checkin'
  | 'post_event_rating'
  | 'host_completion'
  | 'no_show'
  | 'late_cancellation'
  | 'admin_adjustment';
export type ReportTarget = 'user' | 'message' | 'group';
export type ReportStatus = 'submitted' | 'under_review' | 'resolved' | 'dismissed';
export type NotificationPlatform = 'ios' | 'android';

type TableDefinition<Row, Generated extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, Generated> & Partial<Pick<Row, Generated>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type CampusRow = {
  id: string;
  name: string;
  email_domain: string;
  timezone: string;
  is_active: boolean;
  min_group_size: number;
  target_group_size: number;
  max_group_size: number;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  campus_id: string;
  university_email: string;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  graduation_year: number | null;
  role: UserRole;
  age_attested: boolean;
  age_attested_at: string | null;
  safety_acknowledged_at: string | null;
  email_domain_verified_at: string | null;
  onboarding_completed_at: string | null;
  deletion_requested_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InterestRow = {
  id: string;
  campus_id: string;
  name: string;
  emoji: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProfileInterestRow = {
  profile_id: string;
  interest_id: string;
  created_at: string;
};

export type ActivityTemplateRow = {
  id: string;
  campus_id: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  image_path: string | null;
  gradient_start: string;
  gradient_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ActivitySessionRow = {
  id: string;
  activity_template_id: string;
  campus_id: string;
  starts_at: string;
  ends_at: string;
  swipe_closes_at: string;
  capacity: number;
  status: SessionStatus;
  public_venue_name: string | null;
  public_venue_address: string | null;
  venue_notes: string | null;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SwipeRow = {
  id: string;
  profile_id: string;
  activity_session_id: string;
  decision: SwipeDecision;
  created_at: string;
  updated_at: string;
};

export type WaitlistEntryRow = {
  id: string;
  profile_id: string;
  activity_session_id: string;
  status: WaitlistStatus;
  matched_group_id: string | null;
  joined_at: string;
  matched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupRow = {
  id: string;
  activity_session_id: string;
  campus_id: string;
  status: GroupStatus;
  min_size: number;
  target_size: number;
  max_size: number;
  confirmation_deadline: string;
  venue_revealed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupMemberRow = {
  id: string;
  group_id: string;
  profile_id: string;
  status: GroupMemberStatus;
  is_host: boolean;
  joined_at: string;
  left_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  group_id: string;
  sender_id: string | null;
  kind: MessageKind;
  body: string;
  client_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendanceConfirmationRow = {
  id: string;
  group_id: string;
  profile_id: string;
  status: ConfirmationStatus;
  deadline: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckinTokenRow = {
  id: string;
  group_id: string;
  activity_session_id: string;
  created_by: string;
  token_digest: string;
  valid_from: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckinRow = {
  id: string;
  group_id: string;
  activity_session_id: string;
  profile_id: string;
  checkin_token_id: string;
  verified_at: string;
  created_at: string;
  updated_at: string;
};

export type PushTokenRow = {
  id: string;
  profile_id: string;
  expo_push_token: string;
  platform: NotificationPlatform;
  device_id: string;
  last_seen_at: string;
  invalidated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type XpLedgerRow = {
  id: string;
  profile_id: string;
  campus_id: string;
  amount: number;
  reason: XpReason;
  source_type: string;
  source_id: string;
  note: string | null;
  created_at: string;
};

export type BlockRow = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  updated_at: string;
};

export type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_user_id: string | null;
  target_message_id: string | null;
  target_group_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminActionRow = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type EventRatingRow = {
  id: string;
  profile_id: string;
  activity_session_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityFeedRow = {
  id: string | null;
  activity_template_id: string | null;
  campus_id: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  duration_minutes: number | null;
  image_path: string | null;
  gradient_start: string | null;
  gradient_end: string | null;
  starts_at: string | null;
  ends_at: string | null;
  swipe_closes_at: string | null;
  capacity: number | null;
};

export type Database = {
  public: {
    Tables: {
      campuses: TableDefinition<
        CampusRow,
        | 'id'
        | 'timezone'
        | 'is_active'
        | 'min_group_size'
        | 'target_group_size'
        | 'max_group_size'
        | 'created_at'
        | 'updated_at'
      >;
      profiles: TableDefinition<
        ProfileRow,
        | 'display_name'
        | 'avatar_path'
        | 'bio'
        | 'graduation_year'
        | 'role'
        | 'age_attested'
        | 'age_attested_at'
        | 'safety_acknowledged_at'
        | 'email_domain_verified_at'
        | 'onboarding_completed_at'
        | 'deletion_requested_at'
        | 'created_at'
        | 'updated_at'
      >;
      interests: TableDefinition<
        InterestRow,
        'id' | 'sort_order' | 'created_at' | 'updated_at'
      >;
      profile_interests: TableDefinition<ProfileInterestRow, 'created_at'>;
      activity_templates: TableDefinition<
        ActivityTemplateRow,
        | 'id'
        | 'image_path'
        | 'gradient_start'
        | 'gradient_end'
        | 'is_active'
        | 'created_at'
        | 'updated_at'
      >;
      activity_sessions: TableDefinition<
        ActivitySessionRow,
        | 'id'
        | 'capacity'
        | 'status'
        | 'public_venue_name'
        | 'public_venue_address'
        | 'venue_notes'
        | 'checkin_opens_at'
        | 'checkin_closes_at'
        | 'created_at'
        | 'updated_at'
      >;
      swipes: TableDefinition<SwipeRow, 'id' | 'created_at' | 'updated_at'>;
      waitlist_entries: TableDefinition<
        WaitlistEntryRow,
        | 'id'
        | 'status'
        | 'matched_group_id'
        | 'joined_at'
        | 'matched_at'
        | 'created_at'
        | 'updated_at'
      >;
      groups: TableDefinition<
        GroupRow,
        'id' | 'status' | 'venue_revealed_at' | 'created_at' | 'updated_at'
      >;
      group_members: TableDefinition<
        GroupMemberRow,
        | 'id'
        | 'status'
        | 'is_host'
        | 'joined_at'
        | 'left_at'
        | 'created_at'
        | 'updated_at'
      >;
      messages: TableDefinition<
        MessageRow,
        'id' | 'kind' | 'client_id' | 'created_at' | 'updated_at'
      >;
      attendance_confirmations: TableDefinition<
        AttendanceConfirmationRow,
        'id' | 'status' | 'responded_at' | 'created_at' | 'updated_at'
      >;
      checkin_tokens: TableDefinition<
        CheckinTokenRow,
        'id' | 'revoked_at' | 'created_at' | 'updated_at'
      >;
      checkins: TableDefinition<
        CheckinRow,
        'id' | 'verified_at' | 'created_at' | 'updated_at'
      >;
      push_tokens: TableDefinition<
        PushTokenRow,
        'id' | 'last_seen_at' | 'invalidated_at' | 'created_at' | 'updated_at'
      >;
      xp_ledger: TableDefinition<XpLedgerRow, 'id' | 'note' | 'created_at'>;
      blocks: TableDefinition<BlockRow, 'id' | 'created_at' | 'updated_at'>;
      reports: TableDefinition<
        ReportRow,
        | 'id'
        | 'target_user_id'
        | 'target_message_id'
        | 'target_group_id'
        | 'details'
        | 'status'
        | 'reviewed_by'
        | 'reviewed_at'
        | 'resolution_notes'
        | 'created_at'
        | 'updated_at'
      >;
      admin_actions: TableDefinition<
        AdminActionRow,
        'id' | 'metadata' | 'created_at' | 'updated_at'
      >;
      event_ratings: TableDefinition<
        EventRatingRow,
        'id' | 'feedback' | 'created_at' | 'updated_at'
      >;
    };
    Views: {
      activity_feed: {
        Row: ActivityFeedRow;
        Relationships: [];
      };
    };
    Functions: {
      block_user: {
        Args: { target_profile_id: string };
        Returns: undefined;
      };
      confirm_attendance: {
        Args: { target_group_id: string };
        Returns: Json;
      };
      create_checkin_token_digest: {
        Args: {
          target_group_id: string;
          digest_value: string;
          lifetime_seconds?: number;
        };
        Returns: string;
      };
      finalize_group_attendance: {
        Args: { target_group_id: string };
        Returns: Json;
      };
      get_group_lobby: {
        Args: { target_group_id: string };
        Returns: Json;
      };
      get_leaderboard: {
        Args: { period?: string };
        Returns: {
          profile_id: string;
          display_name: string;
          avatar_path: string | null;
          xp: number;
          rank: number;
          is_current_user: boolean;
        }[];
      };
      get_xp_total: {
        Args: { target_profile_id?: string };
        Returns: number;
      };
      leave_group: {
        Args: { target_group_id: string; apply_late_penalty?: boolean };
        Returns: undefined;
      };
      process_swipe_and_match: {
        Args: { target_session_id: string };
        Returns: Json;
      };
      record_activity_pass: {
        Args: { target_session_id: string };
        Returns: Json;
      };
      redeem_checkin_token_digest: {
        Args: { digest_value: string };
        Returns: Json;
      };
      register_push_token: {
        Args: {
          token_value: string;
          platform_value: NotificationPlatform;
          device_value: string;
        };
        Returns: string;
      };
      report_message: {
        Args: {
          target_message_id: string;
          report_reason: string;
          report_details?: string;
        };
        Returns: string;
      };
      request_account_deletion: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      submit_event_rating: {
        Args: {
          target_session_id: string;
          rating_value: number;
          feedback_value?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      session_status: SessionStatus;
      swipe_decision: SwipeDecision;
      waitlist_status: WaitlistStatus;
      group_status: GroupStatus;
      group_member_status: GroupMemberStatus;
      message_kind: MessageKind;
      confirmation_status: ConfirmationStatus;
      xp_reason: XpReason;
      report_target: ReportTarget;
      report_status: ReportStatus;
      notification_platform: NotificationPlatform;
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database['public'];

export type Tables<Name extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[Name]['Row'];

export type TablesInsert<Name extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][Name]['Insert'];

export type TablesUpdate<Name extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][Name]['Update'];

export type Enums<Name extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][Name];
