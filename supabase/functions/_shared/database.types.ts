export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activity_sessions: {
        Row: {
          activity_template_id: string;
          campus_id: string;
          capacity: number;
          checkin_closes_at: string | null;
          checkin_opens_at: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          public_venue_address: string | null;
          public_venue_name: string | null;
          starts_at: string;
          status: Database['public']['Enums']['session_status'];
          swipe_closes_at: string;
          updated_at: string;
          venue_notes: string | null;
        };
        Insert: {
          activity_template_id: string;
          campus_id: string;
          capacity?: number;
          checkin_closes_at?: string | null;
          checkin_opens_at?: string | null;
          created_at?: string;
          ends_at: string;
          id?: string;
          public_venue_address?: string | null;
          public_venue_name?: string | null;
          starts_at: string;
          status?: Database['public']['Enums']['session_status'];
          swipe_closes_at: string;
          updated_at?: string;
          venue_notes?: string | null;
        };
        Update: {
          activity_template_id?: string;
          campus_id?: string;
          capacity?: number;
          checkin_closes_at?: string | null;
          checkin_opens_at?: string | null;
          created_at?: string;
          ends_at?: string;
          id?: string;
          public_venue_address?: string | null;
          public_venue_name?: string | null;
          starts_at?: string;
          status?: Database['public']['Enums']['session_status'];
          swipe_closes_at?: string;
          updated_at?: string;
          venue_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_sessions_activity_template_id_fkey';
            columns: ['activity_template_id'];
            isOneToOne: false;
            referencedRelation: 'activity_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_sessions_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          }
        ];
      };
      activity_templates: {
        Row: {
          campus_id: string;
          category: string;
          created_at: string;
          description: string;
          duration_minutes: number;
          gradient_end: string;
          gradient_start: string;
          id: string;
          image_path: string | null;
          is_active: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          campus_id: string;
          category: string;
          created_at?: string;
          description: string;
          duration_minutes: number;
          gradient_end?: string;
          gradient_start?: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          campus_id?: string;
          category?: string;
          created_at?: string;
          description?: string;
          duration_minutes?: number;
          gradient_end?: string;
          gradient_start?: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_templates_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          }
        ];
      };
      admin_actions: {
        Row: {
          action: string;
          admin_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          target_id: string;
          target_type: string;
          updated_at: string;
        };
        Insert: {
          action: string;
          admin_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id: string;
          target_type: string;
          updated_at?: string;
        };
        Update: {
          action?: string;
          admin_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string;
          target_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_actions_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      attendance_confirmations: {
        Row: {
          created_at: string;
          deadline: string;
          group_id: string;
          id: string;
          profile_id: string;
          responded_at: string | null;
          status: Database['public']['Enums']['confirmation_status'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deadline: string;
          group_id: string;
          id?: string;
          profile_id: string;
          responded_at?: string | null;
          status?: Database['public']['Enums']['confirmation_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deadline?: string;
          group_id?: string;
          id?: string;
          profile_id?: string;
          responded_at?: string | null;
          status?: Database['public']['Enums']['confirmation_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_confirmations_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_confirmations_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      badge_definitions: {
        Row: {
          created_at: string;
          description: string;
          icon: string;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          icon: string;
          id: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      campuses: {
        Row: {
          created_at: string;
          email_domain: string;
          id: string;
          is_active: boolean;
          max_group_size: number;
          min_group_size: number;
          name: string;
          target_group_size: number;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email_domain: string;
          id?: string;
          is_active?: boolean;
          max_group_size?: number;
          min_group_size?: number;
          name: string;
          target_group_size?: number;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email_domain?: string;
          id?: string;
          is_active?: boolean;
          max_group_size?: number;
          min_group_size?: number;
          name?: string;
          target_group_size?: number;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      checkin_tokens: {
        Row: {
          activity_session_id: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          group_id: string;
          id: string;
          revoked_at: string | null;
          token_digest: string;
          updated_at: string;
          valid_from: string;
        };
        Insert: {
          activity_session_id: string;
          created_at?: string;
          created_by: string;
          expires_at: string;
          group_id: string;
          id?: string;
          revoked_at?: string | null;
          token_digest: string;
          updated_at?: string;
          valid_from: string;
        };
        Update: {
          activity_session_id?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          group_id?: string;
          id?: string;
          revoked_at?: string | null;
          token_digest?: string;
          updated_at?: string;
          valid_from?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkin_tokens_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_feed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkin_tokens_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkin_tokens_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkin_tokens_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      checkins: {
        Row: {
          activity_session_id: string;
          checkin_token_id: string;
          created_at: string;
          group_id: string;
          id: string;
          profile_id: string;
          updated_at: string;
          verified_at: string;
        };
        Insert: {
          activity_session_id: string;
          checkin_token_id: string;
          created_at?: string;
          group_id: string;
          id?: string;
          profile_id: string;
          updated_at?: string;
          verified_at?: string;
        };
        Update: {
          activity_session_id?: string;
          checkin_token_id?: string;
          created_at?: string;
          group_id?: string;
          id?: string;
          profile_id?: string;
          updated_at?: string;
          verified_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkins_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_feed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_checkin_token_id_fkey';
            columns: ['checkin_token_id'];
            isOneToOne: false;
            referencedRelation: 'checkin_tokens';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      data_export_requests: {
        Row: {
          artifact_path: string | null;
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
          id: string;
          profile_id: string;
          requested_at: string;
          status: Database['public']['Enums']['data_request_status'];
          updated_at: string;
        };
        Insert: {
          artifact_path?: string | null;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          profile_id: string;
          requested_at?: string;
          status?: Database['public']['Enums']['data_request_status'];
          updated_at?: string;
        };
        Update: {
          artifact_path?: string | null;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          profile_id?: string;
          requested_at?: string;
          status?: Database['public']['Enums']['data_request_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'data_export_requests_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      event_announcements: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          event_id: string;
          id: string;
          sent_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          event_id: string;
          id?: string;
          sent_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          sent_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_announcements_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_announcements_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_announcements_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          }
        ];
      };
      event_chat_members: {
        Row: {
          created_at: string;
          event_id: string;
          is_active: boolean;
          joined_at: string;
          last_read_at: string | null;
          notifications_muted: boolean;
          profile_id: string;
          revoked_at: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          is_active?: boolean;
          joined_at?: string;
          last_read_at?: string | null;
          notifications_muted?: boolean;
          profile_id: string;
          revoked_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          is_active?: boolean;
          joined_at?: string;
          last_read_at?: string | null;
          notifications_muted?: boolean;
          profile_id?: string;
          revoked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_chat_members_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_chat_members_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_chat_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      event_checkin_tokens: {
        Row: {
          created_at: string;
          created_by: string;
          event_id: string;
          expires_at: string;
          id: string;
          revoked_at: string | null;
          token_digest: string;
          valid_from: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          event_id: string;
          expires_at: string;
          id?: string;
          revoked_at?: string | null;
          token_digest: string;
          valid_from: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          event_id?: string;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          token_digest?: string;
          valid_from?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_checkin_tokens_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_checkin_tokens_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_checkin_tokens_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          }
        ];
      };
      event_checkins: {
        Row: {
          checkin_token_id: string;
          created_at: string;
          event_id: string;
          id: string;
          profile_id: string;
          verified_at: string;
        };
        Insert: {
          checkin_token_id: string;
          created_at?: string;
          event_id: string;
          id?: string;
          profile_id: string;
          verified_at?: string;
        };
        Update: {
          checkin_token_id?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          profile_id?: string;
          verified_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_checkins_checkin_token_id_fkey';
            columns: ['checkin_token_id'];
            isOneToOne: false;
            referencedRelation: 'event_checkin_tokens';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_checkins_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_checkins_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_checkins_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      event_discovery_decisions: {
        Row: {
          created_at: string;
          decision: Database['public']['Enums']['event_decision'];
          event_id: string;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          decision: Database['public']['Enums']['event_decision'];
          event_id: string;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          decision?: Database['public']['Enums']['event_decision'];
          event_id?: string;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_discovery_decisions_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_discovery_decisions_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_discovery_decisions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      event_hosts: {
        Row: {
          added_by: string | null;
          created_at: string;
          event_id: string;
          id: string;
          profile_id: string;
          role: Database['public']['Enums']['event_host_role'];
          updated_at: string;
        };
        Insert: {
          added_by?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          profile_id: string;
          role?: Database['public']['Enums']['event_host_role'];
          updated_at?: string;
        };
        Update: {
          added_by?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          profile_id?: string;
          role?: Database['public']['Enums']['event_host_role'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_hosts_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_hosts_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_hosts_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_hosts_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      event_media: {
        Row: {
          alt_text: string;
          created_at: string;
          created_by: string;
          event_id: string;
          id: string;
          sort_order: number;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          alt_text: string;
          created_at?: string;
          created_by: string;
          event_id: string;
          id?: string;
          sort_order?: number;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          alt_text?: string;
          created_at?: string;
          created_by?: string;
          event_id?: string;
          id?: string;
          sort_order?: number;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_media_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_media_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_media_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          }
        ];
      };
      event_message_reactions: {
        Row: {
          created_at: string;
          message_id: string;
          profile_id: string;
          reaction: string;
        };
        Insert: {
          created_at?: string;
          message_id: string;
          profile_id: string;
          reaction: string;
        };
        Update: {
          created_at?: string;
          message_id?: string;
          profile_id?: string;
          reaction?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_message_reactions_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'event_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_message_reactions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      event_messages: {
        Row: {
          body: string;
          client_id: string | null;
          created_at: string;
          event_id: string;
          id: string;
          kind: Database['public']['Enums']['event_message_kind'];
          removed_at: string | null;
          removed_by: string | null;
          reply_to_id: string | null;
          sender_id: string | null;
          updated_at: string;
        };
        Insert: {
          body: string;
          client_id?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          kind?: Database['public']['Enums']['event_message_kind'];
          removed_at?: string | null;
          removed_by?: string | null;
          reply_to_id?: string | null;
          sender_id?: string | null;
          updated_at?: string;
        };
        Update: {
          body?: string;
          client_id?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          kind?: Database['public']['Enums']['event_message_kind'];
          removed_at?: string | null;
          removed_by?: string | null;
          reply_to_id?: string | null;
          sender_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_messages_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_messages_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_messages_removed_by_fkey';
            columns: ['removed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_messages_reply_to_id_fkey';
            columns: ['reply_to_id'];
            isOneToOne: false;
            referencedRelation: 'event_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      event_ratings: {
        Row: {
          activity_session_id: string;
          created_at: string;
          feedback: string | null;
          id: string;
          profile_id: string;
          rating: number;
          updated_at: string;
        };
        Insert: {
          activity_session_id: string;
          created_at?: string;
          feedback?: string | null;
          id?: string;
          profile_id: string;
          rating: number;
          updated_at?: string;
        };
        Update: {
          activity_session_id?: string;
          created_at?: string;
          feedback?: string | null;
          id?: string;
          profile_id?: string;
          rating?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_ratings_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_feed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_ratings_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_ratings_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      event_rsvp_status_history: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_id: string;
          from_status: Database['public']['Enums']['rsvp_status'] | null;
          id: string;
          profile_id: string;
          reason: string | null;
          rsvp_id: string;
          to_status: Database['public']['Enums']['rsvp_status'];
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_id: string;
          from_status?: Database['public']['Enums']['rsvp_status'] | null;
          id?: string;
          profile_id: string;
          reason?: string | null;
          rsvp_id: string;
          to_status: Database['public']['Enums']['rsvp_status'];
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_id?: string;
          from_status?: Database['public']['Enums']['rsvp_status'] | null;
          id?: string;
          profile_id?: string;
          reason?: string | null;
          rsvp_id?: string;
          to_status?: Database['public']['Enums']['rsvp_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'event_rsvp_status_history_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_rsvp_status_history_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_rsvp_status_history_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_rsvp_status_history_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_rsvp_status_history_rsvp_id_fkey';
            columns: ['rsvp_id'];
            isOneToOne: false;
            referencedRelation: 'event_rsvps';
            referencedColumns: ['id'];
          }
        ];
      };
      event_rsvps: {
        Row: {
          cancelled_at: string | null;
          created_at: string;
          event_id: string;
          id: string;
          idempotency_key: string | null;
          joined_at: string;
          profile_id: string;
          promoted_at: string | null;
          responded_at: string | null;
          status: Database['public']['Enums']['rsvp_status'];
          status_reason: string | null;
          updated_at: string;
          waitlist_position: number | null;
        };
        Insert: {
          cancelled_at?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          idempotency_key?: string | null;
          joined_at?: string;
          profile_id: string;
          promoted_at?: string | null;
          responded_at?: string | null;
          status: Database['public']['Enums']['rsvp_status'];
          status_reason?: string | null;
          updated_at?: string;
          waitlist_position?: number | null;
        };
        Update: {
          cancelled_at?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          idempotency_key?: string | null;
          joined_at?: string;
          profile_id?: string;
          promoted_at?: string | null;
          responded_at?: string | null;
          status?: Database['public']['Enums']['rsvp_status'];
          status_reason?: string | null;
          updated_at?: string;
          waitlist_position?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'event_rsvps_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_rsvps_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_rsvps_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      event_tags: {
        Row: {
          created_at: string;
          event_id: string;
          tag_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          tag_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_tags_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_tags_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          }
        ];
      };
      events: {
        Row: {
          accessibility_information: string | null;
          approval_required: boolean;
          archived_at: string | null;
          attendee_list_visible: boolean;
          campus_id: string;
          cancellation_policy: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          capacity: number;
          category: string;
          checkin_closes_at: string | null;
          checkin_opens_at: string | null;
          completed_at: string | null;
          cost_information: string | null;
          cover_image_path: string | null;
          created_at: string;
          created_by: string;
          description: string;
          eligibility_requirements: string | null;
          ends_at: string;
          id: string;
          latitude: number | null;
          location_description: string;
          longitude: number | null;
          min_age: number;
          moderation_restricted: boolean;
          organization_id: string | null;
          published_at: string | null;
          reveal_coordinates_after_confirmation: boolean;
          safety_rules: string | null;
          slug: string;
          starts_at: string;
          status: Database['public']['Enums']['event_status'];
          timezone: string;
          title: string;
          updated_at: string;
          venue_name: string;
          visibility: Database['public']['Enums']['event_visibility'];
          waitlist_enabled: boolean;
          waitlist_sequence: number;
        };
        Insert: {
          accessibility_information?: string | null;
          approval_required?: boolean;
          archived_at?: string | null;
          attendee_list_visible?: boolean;
          campus_id: string;
          cancellation_policy?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          capacity: number;
          category: string;
          checkin_closes_at?: string | null;
          checkin_opens_at?: string | null;
          completed_at?: string | null;
          cost_information?: string | null;
          cover_image_path?: string | null;
          created_at?: string;
          created_by: string;
          description: string;
          eligibility_requirements?: string | null;
          ends_at: string;
          id?: string;
          latitude?: number | null;
          location_description?: string;
          longitude?: number | null;
          min_age?: number;
          moderation_restricted?: boolean;
          organization_id?: string | null;
          published_at?: string | null;
          reveal_coordinates_after_confirmation?: boolean;
          safety_rules?: string | null;
          slug: string;
          starts_at: string;
          status?: Database['public']['Enums']['event_status'];
          timezone: string;
          title: string;
          updated_at?: string;
          venue_name: string;
          visibility?: Database['public']['Enums']['event_visibility'];
          waitlist_enabled?: boolean;
          waitlist_sequence?: number;
        };
        Update: {
          accessibility_information?: string | null;
          approval_required?: boolean;
          archived_at?: string | null;
          attendee_list_visible?: boolean;
          campus_id?: string;
          cancellation_policy?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          capacity?: number;
          category?: string;
          checkin_closes_at?: string | null;
          checkin_opens_at?: string | null;
          completed_at?: string | null;
          cost_information?: string | null;
          cover_image_path?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string;
          eligibility_requirements?: string | null;
          ends_at?: string;
          id?: string;
          latitude?: number | null;
          location_description?: string;
          longitude?: number | null;
          min_age?: number;
          moderation_restricted?: boolean;
          organization_id?: string | null;
          published_at?: string | null;
          reveal_coordinates_after_confirmation?: boolean;
          safety_rules?: string | null;
          slug?: string;
          starts_at?: string;
          status?: Database['public']['Enums']['event_status'];
          timezone?: string;
          title?: string;
          updated_at?: string;
          venue_name?: string;
          visibility?: Database['public']['Enums']['event_visibility'];
          waitlist_enabled?: boolean;
          waitlist_sequence?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'events_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'public_organization_profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      group_members: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          is_host: boolean;
          joined_at: string;
          left_at: string | null;
          profile_id: string;
          status: Database['public']['Enums']['group_member_status'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          is_host?: boolean;
          joined_at?: string;
          left_at?: string | null;
          profile_id: string;
          status?: Database['public']['Enums']['group_member_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          is_host?: boolean;
          joined_at?: string;
          left_at?: string | null;
          profile_id?: string;
          status?: Database['public']['Enums']['group_member_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      groups: {
        Row: {
          activity_session_id: string;
          campus_id: string;
          confirmation_deadline: string;
          created_at: string;
          id: string;
          max_size: number;
          min_size: number;
          status: Database['public']['Enums']['group_status'];
          target_size: number;
          updated_at: string;
          venue_revealed_at: string | null;
        };
        Insert: {
          activity_session_id: string;
          campus_id: string;
          confirmation_deadline: string;
          created_at?: string;
          id?: string;
          max_size: number;
          min_size: number;
          status?: Database['public']['Enums']['group_status'];
          target_size: number;
          updated_at?: string;
          venue_revealed_at?: string | null;
        };
        Update: {
          activity_session_id?: string;
          campus_id?: string;
          confirmation_deadline?: string;
          created_at?: string;
          id?: string;
          max_size?: number;
          min_size?: number;
          status?: Database['public']['Enums']['group_status'];
          target_size?: number;
          updated_at?: string;
          venue_revealed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'groups_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_feed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'groups_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'groups_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          }
        ];
      };
      interests: {
        Row: {
          campus_id: string;
          created_at: string;
          emoji: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          campus_id: string;
          created_at?: string;
          emoji: string;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          campus_id?: string;
          created_at?: string;
          emoji?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'interests_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          }
        ];
      };
      legal_acceptances: {
        Row: {
          accepted_at: string;
          document_type: string;
          document_version: string;
          id: string;
          profile_id: string;
        };
        Insert: {
          accepted_at?: string;
          document_type: string;
          document_version: string;
          id?: string;
          profile_id: string;
        };
        Update: {
          accepted_at?: string;
          document_type?: string;
          document_version?: string;
          id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'legal_acceptances_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      messages: {
        Row: {
          body: string;
          client_id: string | null;
          created_at: string;
          group_id: string;
          id: string;
          kind: Database['public']['Enums']['message_kind'];
          removed_at: string | null;
          removed_by: string | null;
          sender_id: string | null;
          updated_at: string;
        };
        Insert: {
          body: string;
          client_id?: string | null;
          created_at?: string;
          group_id: string;
          id?: string;
          kind?: Database['public']['Enums']['message_kind'];
          removed_at?: string | null;
          removed_by?: string | null;
          sender_id?: string | null;
          updated_at?: string;
        };
        Update: {
          body?: string;
          client_id?: string | null;
          created_at?: string;
          group_id?: string;
          id?: string;
          kind?: Database['public']['Enums']['message_kind'];
          removed_at?: string | null;
          removed_by?: string | null;
          sender_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_removed_by_fkey';
            columns: ['removed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      moderation_actions: {
        Row: {
          action: Database['public']['Enums']['moderation_action_kind'];
          case_id: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          metadata: Json;
          moderator_id: string;
          reason: string;
          target_id: string;
          target_type: string;
        };
        Insert: {
          action: Database['public']['Enums']['moderation_action_kind'];
          case_id: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          moderator_id: string;
          reason: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          action?: Database['public']['Enums']['moderation_action_kind'];
          case_id?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          moderator_id?: string;
          reason?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moderation_actions_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'moderation_cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_actions_moderator_id_fkey';
            columns: ['moderator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      moderation_cases: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          id: string;
          report_id: string | null;
          resolution_notes: string | null;
          severity: number;
          status: Database['public']['Enums']['moderation_case_status'];
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          id?: string;
          report_id?: string | null;
          resolution_notes?: string | null;
          severity?: number;
          status?: Database['public']['Enums']['moderation_case_status'];
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          id?: string;
          report_id?: string | null;
          resolution_notes?: string | null;
          severity?: number;
          status?: Database['public']['Enums']['moderation_case_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moderation_cases_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_cases_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          }
        ];
      };
      notification_dispatches: {
        Row: {
          dispatched_at: string;
          event_type: string;
          id: string;
          source_id: string;
        };
        Insert: {
          dispatched_at?: string;
          event_type: string;
          id?: string;
          source_id: string;
        };
        Update: {
          dispatched_at?: string;
          event_type?: string;
          id?: string;
          source_id?: string;
        };
        Relationships: [];
      };
      notification_jobs: {
        Row: {
          attempts: number;
          created_at: string;
          deduplication_key: string;
          event_id: string | null;
          id: string;
          kind: string;
          last_error_code: string | null;
          payload: Json;
          processed_at: string | null;
          profile_id: string;
          scheduled_for: string;
          status: Database['public']['Enums']['notification_job_status'];
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          deduplication_key: string;
          event_id?: string | null;
          id?: string;
          kind: string;
          last_error_code?: string | null;
          payload?: Json;
          processed_at?: string | null;
          profile_id: string;
          scheduled_for?: string;
          status?: Database['public']['Enums']['notification_job_status'];
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          deduplication_key?: string;
          event_id?: string | null;
          id?: string;
          kind?: string;
          last_error_code?: string | null;
          payload?: Json;
          processed_at?: string | null;
          profile_id?: string;
          scheduled_for?: string;
          status?: Database['public']['Enums']['notification_job_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_jobs_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_jobs_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_jobs_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      notification_preferences: {
        Row: {
          activity_reminders: boolean;
          chat_messages: boolean;
          created_at: string;
          enabled: boolean;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          activity_reminders?: boolean;
          chat_messages?: boolean;
          created_at?: string;
          enabled?: boolean;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          activity_reminders?: boolean;
          chat_messages?: boolean;
          created_at?: string;
          enabled?: boolean;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      organization_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          organization_id: string;
          target_profile_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          organization_id: string;
          target_profile_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          organization_id?: string;
          target_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_audit_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_audit_log_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_audit_log_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'public_organization_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_audit_log_target_profile_id_fkey';
            columns: ['target_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      organization_members: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          id: string;
          invited_at: string;
          invited_by: string | null;
          organization_id: string;
          profile_id: string;
          removed_at: string | null;
          role: Database['public']['Enums']['organization_role'];
          status: Database['public']['Enums']['organization_membership_status'];
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          id?: string;
          invited_at?: string;
          invited_by?: string | null;
          organization_id: string;
          profile_id: string;
          removed_at?: string | null;
          role: Database['public']['Enums']['organization_role'];
          status?: Database['public']['Enums']['organization_membership_status'];
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          id?: string;
          invited_at?: string;
          invited_by?: string | null;
          organization_id?: string;
          profile_id?: string;
          removed_at?: string | null;
          role?: Database['public']['Enums']['organization_role'];
          status?: Database['public']['Enums']['organization_membership_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'public_organization_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      organization_verification_requests: {
        Row: {
          created_at: string;
          evidence: Json;
          id: string;
          organization_id: string;
          request_kind: string;
          requested_by: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['verification_request_status'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          evidence?: Json;
          id?: string;
          organization_id: string;
          request_kind?: string;
          requested_by: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['verification_request_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          evidence?: Json;
          id?: string;
          organization_id?: string;
          request_kind?: string;
          requested_by?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['verification_request_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_verification_requests_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_verification_requests_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'public_organization_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_verification_requests_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_verification_requests_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      organizations: {
        Row: {
          banner_path: string | null;
          campus_id: string;
          contact_email: string | null;
          created_at: string;
          created_by: string;
          description: string;
          id: string;
          is_restricted: boolean;
          is_verified: boolean;
          logo_path: string | null;
          name: string;
          slug: string;
          social_links: Json;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          banner_path?: string | null;
          campus_id: string;
          contact_email?: string | null;
          created_at?: string;
          created_by: string;
          description?: string;
          id?: string;
          is_restricted?: boolean;
          is_verified?: boolean;
          logo_path?: string | null;
          name: string;
          slug: string;
          social_links?: Json;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          banner_path?: string | null;
          campus_id?: string;
          contact_email?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string;
          id?: string;
          is_restricted?: boolean;
          is_verified?: boolean;
          logo_path?: string | null;
          name?: string;
          slug?: string;
          social_links?: Json;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'organizations_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organizations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      partnership_leads: {
        Row: {
          campus_name: string;
          contact_email: string;
          contact_name: string;
          created_at: string;
          id: string;
          lead_type: string;
          message: string;
          organization_name: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source_hash: string;
          status: Database['public']['Enums']['partnership_lead_status'];
          updated_at: string;
        };
        Insert: {
          campus_name: string;
          contact_email: string;
          contact_name: string;
          created_at?: string;
          id?: string;
          lead_type: string;
          message: string;
          organization_name: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_hash: string;
          status?: Database['public']['Enums']['partnership_lead_status'];
          updated_at?: string;
        };
        Update: {
          campus_name?: string;
          contact_email?: string;
          contact_name?: string;
          created_at?: string;
          id?: string;
          lead_type?: string;
          message?: string;
          organization_name?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_hash?: string;
          status?: Database['public']['Enums']['partnership_lead_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partnership_leads_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      profile_interests: {
        Row: {
          created_at: string;
          interest_id: string;
          profile_id: string;
        };
        Insert: {
          created_at?: string;
          interest_id: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          interest_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_interests_interest_id_fkey';
            columns: ['interest_id'];
            isOneToOne: false;
            referencedRelation: 'interests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_interests_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      profile_preferences: {
        Row: {
          accessibility_notes: string | null;
          announcement_notifications: boolean;
          chat_notifications: boolean;
          created_at: string;
          discovery_preferences: Json;
          event_reminders: boolean;
          leaderboard_visible: boolean;
          notification_previews: boolean;
          profile_id: string;
          reduced_motion: boolean;
          show_attended_history: boolean;
          show_hosted_history: boolean;
          updated_at: string;
        };
        Insert: {
          accessibility_notes?: string | null;
          announcement_notifications?: boolean;
          chat_notifications?: boolean;
          created_at?: string;
          discovery_preferences?: Json;
          event_reminders?: boolean;
          leaderboard_visible?: boolean;
          notification_previews?: boolean;
          profile_id: string;
          reduced_motion?: boolean;
          show_attended_history?: boolean;
          show_hosted_history?: boolean;
          updated_at?: string;
        };
        Update: {
          accessibility_notes?: string | null;
          announcement_notifications?: boolean;
          chat_notifications?: boolean;
          created_at?: string;
          discovery_preferences?: Json;
          event_reminders?: boolean;
          leaderboard_visible?: boolean;
          notification_previews?: boolean;
          profile_id?: string;
          reduced_motion?: boolean;
          show_attended_history?: boolean;
          show_hosted_history?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_preferences_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      profiles: {
        Row: {
          age_attested: boolean;
          age_attested_at: string | null;
          avatar_path: string | null;
          banned_at: string | null;
          bio: string | null;
          campus_id: string;
          created_at: string;
          deletion_requested_at: string | null;
          display_name: string | null;
          email_domain_verified_at: string | null;
          graduation_year: number | null;
          id: string;
          onboarding_completed_at: string | null;
          role: Database['public']['Enums']['user_role'];
          safety_acknowledged_at: string | null;
          suspended_until: string | null;
          trust_level: number;
          university_email: string;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          age_attested?: boolean;
          age_attested_at?: string | null;
          avatar_path?: string | null;
          banned_at?: string | null;
          bio?: string | null;
          campus_id: string;
          created_at?: string;
          deletion_requested_at?: string | null;
          display_name?: string | null;
          email_domain_verified_at?: string | null;
          graduation_year?: number | null;
          id: string;
          onboarding_completed_at?: string | null;
          role?: Database['public']['Enums']['user_role'];
          safety_acknowledged_at?: string | null;
          suspended_until?: string | null;
          trust_level?: number;
          university_email: string;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          age_attested?: boolean;
          age_attested_at?: string | null;
          avatar_path?: string | null;
          banned_at?: string | null;
          bio?: string | null;
          campus_id?: string;
          created_at?: string;
          deletion_requested_at?: string | null;
          display_name?: string | null;
          email_domain_verified_at?: string | null;
          graduation_year?: number | null;
          id?: string;
          onboarding_completed_at?: string | null;
          role?: Database['public']['Enums']['user_role'];
          safety_acknowledged_at?: string | null;
          suspended_until?: string | null;
          trust_level?: number;
          university_email?: string;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          }
        ];
      };
      push_receipts: {
        Row: {
          checked_at: string | null;
          created_at: string;
          error_code: string | null;
          id: string;
          push_token_id: string;
          status: string;
          ticket_id: string;
        };
        Insert: {
          checked_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          push_token_id: string;
          status?: string;
          ticket_id: string;
        };
        Update: {
          checked_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          push_token_id?: string;
          status?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_receipts_push_token_id_fkey';
            columns: ['push_token_id'];
            isOneToOne: false;
            referencedRelation: 'push_tokens';
            referencedColumns: ['id'];
          }
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          device_id: string;
          expo_push_token: string;
          id: string;
          invalidated_at: string | null;
          last_seen_at: string;
          platform: Database['public']['Enums']['notification_platform'];
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          device_id: string;
          expo_push_token: string;
          id?: string;
          invalidated_at?: string | null;
          last_seen_at?: string;
          platform: Database['public']['Enums']['notification_platform'];
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          expo_push_token?: string;
          id?: string;
          invalidated_at?: string | null;
          last_seen_at?: string;
          platform?: Database['public']['Enums']['notification_platform'];
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      referral_codes: {
        Row: {
          campus_id: string;
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          kind: Database['public']['Enums']['referral_code_kind'];
          organization_id: string | null;
          owner_profile_id: string | null;
        };
        Insert: {
          campus_id: string;
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind: Database['public']['Enums']['referral_code_kind'];
          organization_id?: string | null;
          owner_profile_id?: string | null;
        };
        Update: {
          campus_id?: string;
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind?: Database['public']['Enums']['referral_code_kind'];
          organization_id?: string | null;
          owner_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'referral_codes_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'referral_codes_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'referral_codes_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'public_organization_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'referral_codes_owner_profile_id_fkey';
            columns: ['owner_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      referrals: {
        Row: {
          created_at: string;
          id: string;
          qualified_at: string | null;
          referral_code_id: string;
          referred_profile_id: string;
          rejection_reason: string | null;
          rewarded_at: string | null;
          status: Database['public']['Enums']['referral_status'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          qualified_at?: string | null;
          referral_code_id: string;
          referred_profile_id: string;
          rejection_reason?: string | null;
          rewarded_at?: string | null;
          status?: Database['public']['Enums']['referral_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          qualified_at?: string | null;
          referral_code_id?: string;
          referred_profile_id?: string;
          rejection_reason?: string | null;
          rewarded_at?: string | null;
          status?: Database['public']['Enums']['referral_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'referrals_referral_code_id_fkey';
            columns: ['referral_code_id'];
            isOneToOne: false;
            referencedRelation: 'referral_codes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'referrals_referred_profile_id_fkey';
            columns: ['referred_profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: string;
          reporter_id: string;
          resolution_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['report_status'];
          target_event_id: string | null;
          target_event_message_id: string | null;
          target_group_id: string | null;
          target_message_id: string | null;
          target_organization_id: string | null;
          target_type: Database['public']['Enums']['report_target'];
          target_user_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: string;
          reporter_id: string;
          resolution_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['report_status'];
          target_event_id?: string | null;
          target_event_message_id?: string | null;
          target_group_id?: string | null;
          target_message_id?: string | null;
          target_organization_id?: string | null;
          target_type: Database['public']['Enums']['report_target'];
          target_user_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string;
          resolution_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['report_status'];
          target_event_id?: string | null;
          target_event_message_id?: string | null;
          target_group_id?: string | null;
          target_message_id?: string | null;
          target_organization_id?: string | null;
          target_type?: Database['public']['Enums']['report_target'];
          target_user_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_target_event_fk';
            columns: ['target_event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_target_event_fk';
            columns: ['target_event_id'];
            isOneToOne: false;
            referencedRelation: 'public_event_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_target_event_message_id_fkey';
            columns: ['target_event_message_id'];
            isOneToOne: false;
            referencedRelation: 'event_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_target_group_id_fkey';
            columns: ['target_group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_target_message_id_fkey';
            columns: ['target_message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_target_organization_fk';
            columns: ['target_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_target_organization_fk';
            columns: ['target_organization_id'];
            isOneToOne: false;
            referencedRelation: 'public_organization_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      swipes: {
        Row: {
          activity_session_id: string;
          created_at: string;
          decision: Database['public']['Enums']['swipe_decision'];
          id: string;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          activity_session_id: string;
          created_at?: string;
          decision: Database['public']['Enums']['swipe_decision'];
          id?: string;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          activity_session_id?: string;
          created_at?: string;
          decision?: Database['public']['Enums']['swipe_decision'];
          id?: string;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'swipes_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_feed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'swipes_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'swipes_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      tags: {
        Row: {
          campus_id: string | null;
          created_at: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          campus_id?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          campus_id?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tags_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          }
        ];
      };
      user_badges: {
        Row: {
          awarded_at: string;
          badge_id: string;
          profile_id: string;
          source_id: string;
          source_type: string;
        };
        Insert: {
          awarded_at?: string;
          badge_id: string;
          profile_id: string;
          source_id: string;
          source_type: string;
        };
        Update: {
          awarded_at?: string;
          badge_id?: string;
          profile_id?: string;
          source_id?: string;
          source_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_badges_badge_id_fkey';
            columns: ['badge_id'];
            isOneToOne: false;
            referencedRelation: 'badge_definitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_badges_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      waitlist_entries: {
        Row: {
          activity_session_id: string;
          created_at: string;
          id: string;
          joined_at: string;
          matched_at: string | null;
          matched_group_id: string | null;
          profile_id: string;
          status: Database['public']['Enums']['waitlist_status'];
          updated_at: string;
        };
        Insert: {
          activity_session_id: string;
          created_at?: string;
          id?: string;
          joined_at?: string;
          matched_at?: string | null;
          matched_group_id?: string | null;
          profile_id: string;
          status?: Database['public']['Enums']['waitlist_status'];
          updated_at?: string;
        };
        Update: {
          activity_session_id?: string;
          created_at?: string;
          id?: string;
          joined_at?: string;
          matched_at?: string | null;
          matched_group_id?: string | null;
          profile_id?: string;
          status?: Database['public']['Enums']['waitlist_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'waitlist_entries_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_feed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waitlist_entries_activity_session_id_fkey';
            columns: ['activity_session_id'];
            isOneToOne: false;
            referencedRelation: 'activity_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waitlist_entries_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waitlist_matched_group_fk';
            columns: ['matched_group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      xp_ledger: {
        Row: {
          amount: number;
          campus_id: string;
          created_at: string;
          id: string;
          note: string | null;
          profile_id: string;
          reason: Database['public']['Enums']['xp_reason'];
          source_id: string;
          source_type: string;
        };
        Insert: {
          amount: number;
          campus_id: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          profile_id: string;
          reason: Database['public']['Enums']['xp_reason'];
          source_id: string;
          source_type: string;
        };
        Update: {
          amount?: number;
          campus_id?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          profile_id?: string;
          reason?: Database['public']['Enums']['xp_reason'];
          source_id?: string;
          source_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'xp_ledger_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'xp_ledger_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      activity_feed: {
        Row: {
          activity_template_id: string | null;
          campus_id: string | null;
          capacity: number | null;
          category: string | null;
          description: string | null;
          duration_minutes: number | null;
          ends_at: string | null;
          gradient_end: string | null;
          gradient_start: string | null;
          id: string | null;
          image_path: string | null;
          starts_at: string | null;
          swipe_closes_at: string | null;
          title: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_sessions_activity_template_id_fkey';
            columns: ['activity_template_id'];
            isOneToOne: false;
            referencedRelation: 'activity_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_sessions_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          }
        ];
      };
      public_event_pages: {
        Row: {
          accessibility_information: string | null;
          approval_required: boolean | null;
          campus_id: string | null;
          campus_name: string | null;
          cancellation_policy: string | null;
          cancellation_reason: string | null;
          capacity: number | null;
          category: string | null;
          cost_information: string | null;
          cover_image_path: string | null;
          description: string | null;
          ends_at: string | null;
          id: string | null;
          location_description: string | null;
          organization_id: string | null;
          organization_name: string | null;
          organization_verified: boolean | null;
          slug: string | null;
          starts_at: string | null;
          status: Database['public']['Enums']['event_status'] | null;
          timezone: string | null;
          title: string | null;
          venue_name: string | null;
          waitlist_enabled: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'events_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'public_organization_profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      public_organization_profiles: {
        Row: {
          banner_path: string | null;
          campus_id: string | null;
          campus_name: string | null;
          description: string | null;
          id: string | null;
          is_verified: boolean | null;
          logo_path: string | null;
          name: string | null;
          slug: string | null;
          social_links: Json | null;
          website_url: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'organizations_campus_id_fkey';
            columns: ['campus_id'];
            isOneToOne: false;
            referencedRelation: 'campuses';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Functions: {
      apply_moderation_action: {
        Args: {
          action_reason: string;
          action_value: Database['public']['Enums']['moderation_action_kind'];
          expiration?: string;
          target_case_id: string;
        };
        Returns: string;
      };
      archive_event: { Args: { target_event_id: string }; Returns: undefined };
      attest_age_and_safety: {
        Args: never;
        Returns: {
          age_attested: boolean;
          age_attested_at: string | null;
          avatar_path: string | null;
          banned_at: string | null;
          bio: string | null;
          campus_id: string;
          created_at: string;
          deletion_requested_at: string | null;
          display_name: string | null;
          email_domain_verified_at: string | null;
          graduation_year: number | null;
          id: string;
          onboarding_completed_at: string | null;
          role: Database['public']['Enums']['user_role'];
          safety_acknowledged_at: string | null;
          suspended_until: string | null;
          trust_level: number;
          university_email: string;
          updated_at: string;
          username: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      attribute_referral: {
        Args: { referral_code: string };
        Returns: Database['public']['Enums']['referral_status'];
      };
      block_user: { Args: { target_profile_id: string }; Returns: undefined };
      can_access_event_chat: {
        Args: { target_event_id: string };
        Returns: boolean;
      };
      can_manage_organization: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      cancel_event: {
        Args: { cancellation_reason: string; target_event_id: string };
        Returns: number;
      };
      cancel_event_rsvp: {
        Args: { cancellation_reason?: string; target_event_id: string };
        Returns: Json;
      };
      change_organization_member_role: {
        Args: {
          target_organization_id: string;
          target_profile_id: string;
          target_role: Database['public']['Enums']['organization_role'];
        };
        Returns: undefined;
      };
      claim_notification_jobs: {
        Args: { max_jobs?: number };
        Returns: {
          attempts: number;
          created_at: string;
          deduplication_key: string;
          event_id: string | null;
          id: string;
          kind: string;
          last_error_code: string | null;
          payload: Json;
          processed_at: string | null;
          profile_id: string;
          scheduled_for: string;
          status: Database['public']['Enums']['notification_job_status'];
          updated_at: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'notification_jobs';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      complete_onboarding: {
        Args: {
          bio_value: string;
          display_name_value: string;
          graduation_year_value: number;
          interest_ids: string[];
        };
        Returns: {
          age_attested: boolean;
          age_attested_at: string | null;
          avatar_path: string | null;
          banned_at: string | null;
          bio: string | null;
          campus_id: string;
          created_at: string;
          deletion_requested_at: string | null;
          display_name: string | null;
          email_domain_verified_at: string | null;
          graduation_year: number | null;
          id: string;
          onboarding_completed_at: string | null;
          role: Database['public']['Enums']['user_role'];
          safety_acknowledged_at: string | null;
          suspended_until: string | null;
          trust_level: number;
          university_email: string;
          updated_at: string;
          username: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      confirm_attendance: { Args: { target_group_id: string }; Returns: Json };
      create_checkin_token_digest: {
        Args: {
          digest_value: string;
          lifetime_seconds?: number;
          target_group_id: string;
        };
        Returns: string;
      };
      create_event_announcement: {
        Args: {
          announcement_body: string;
          announcement_title: string;
          target_event_id: string;
        };
        Returns: string;
      };
      create_event_checkin_token_digest: {
        Args: {
          target_digest: string;
          target_event_id: string;
          ttl_seconds?: number;
        };
        Returns: string;
      };
      duplicate_event: { Args: { target_event_id: string }; Returns: string };
      ensure_user_referral_code: { Args: never; Returns: string };
      finalize_group_attendance: {
        Args: { target_group_id: string };
        Returns: Json;
      };
      get_event_attendees: { Args: { target_event_id: string }; Returns: Json };
      get_event_detail: { Args: { target_event_id: string }; Returns: Json };
      get_event_feed: {
        Args: {
          category_filter?: string;
          cursor_id?: string;
          cursor_score?: number;
          cursor_starts_at?: string;
          ends_before?: string;
          page_size?: number;
          search_text?: string;
          starts_after?: string;
        };
        Returns: Json;
      };
      get_event_messages: {
        Args: {
          before_created_at?: string;
          before_id?: string;
          page_size?: number;
          target_event_id: string;
        };
        Returns: Json;
      };
      get_group_lobby: { Args: { target_group_id: string }; Returns: Json };
      get_leaderboard: {
        Args: { period?: string };
        Returns: {
          avatar_path: string;
          display_name: string;
          is_current_user: boolean;
          profile_id: string;
          rank: number;
          xp: number;
        }[];
      };
      get_moderation_queue: {
        Args: {
          page_offset?: number;
          page_size?: number;
          search_text?: string;
          severity_filter?: number;
          status_filter?: Database['public']['Enums']['moderation_case_status'];
        };
        Returns: Json;
      };
      get_my_organizations: { Args: never; Returns: Json };
      get_organization_dashboard: {
        Args: { target_organization_id: string };
        Returns: Json;
      };
      get_xp_total: { Args: { target_profile_id?: string }; Returns: number };
      invite_organization_member: {
        Args: {
          target_organization_id: string;
          target_role: Database['public']['Enums']['organization_role'];
          target_username: string;
        };
        Returns: string;
      };
      is_active_group_member: {
        Args: { target_group_id: string };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      is_blocked_between: {
        Args: { first_user_id: string; second_user_id: string };
        Returns: boolean;
      };
      is_event_host: { Args: { target_event_id: string }; Returns: boolean };
      is_event_moderator: {
        Args: { target_event_id: string };
        Returns: boolean;
      };
      join_event: {
        Args: { request_key?: string; target_event_id: string };
        Returns: Json;
      };
      leave_group: {
        Args: { apply_late_penalty?: boolean; target_group_id: string };
        Returns: undefined;
      };
      process_swipe_and_match: {
        Args: { target_session_id: string };
        Returns: Json;
      };
      publish_event: { Args: { target_event_id: string }; Returns: undefined };
      record_activity_pass: {
        Args: { target_session_id: string };
        Returns: Json;
      };
      redeem_checkin_token_digest: {
        Args: { digest_value: string };
        Returns: Json;
      };
      redeem_event_checkin_token_digest: {
        Args: { target_digest: string };
        Returns: Json;
      };
      register_push_token: {
        Args: {
          device_value: string;
          platform_value: Database['public']['Enums']['notification_platform'];
          token_value: string;
        };
        Returns: string;
      };
      remove_organization_member: {
        Args: { target_organization_id: string; target_profile_id: string };
        Returns: undefined;
      };
      report_event: {
        Args: {
          report_details?: string;
          report_reason: string;
          target_event_id: string;
        };
        Returns: string;
      };
      report_event_message: {
        Args: {
          report_details?: string;
          report_reason: string;
          target_message_id: string;
        };
        Returns: string;
      };
      report_group: {
        Args: {
          report_details?: string;
          report_reason: string;
          target_group_id: string;
        };
        Returns: string;
      };
      report_message: {
        Args: {
          report_details?: string;
          report_reason: string;
          target_message_id: string;
        };
        Returns: string;
      };
      report_organization: {
        Args: {
          report_details?: string;
          report_reason: string;
          target_organization_id: string;
        };
        Returns: string;
      };
      report_user: {
        Args: {
          report_details?: string;
          report_reason: string;
          target_profile_id: string;
        };
        Returns: string;
      };
      request_account_deletion: { Args: never; Returns: undefined };
      request_data_export: { Args: never; Returns: Json };
      respond_to_organization_invitation: {
        Args: { accept_invitation: boolean; target_organization_id: string };
        Returns: Database['public']['Enums']['organization_membership_status'];
      };
      review_event_rsvp: {
        Args: {
          approve: boolean;
          review_reason?: string;
          target_rsvp_id: string;
        };
        Returns: Json;
      };
      set_event_message_reaction: {
        Args: {
          enabled: boolean;
          reaction_value: string;
          target_message_id: string;
        };
        Returns: undefined;
      };
      set_notification_preferences: {
        Args: {
          activity_reminders_value: boolean;
          chat_messages_value: boolean;
          enabled_value: boolean;
        };
        Returns: undefined;
      };
      submit_event_rating: {
        Args: {
          feedback_value?: string;
          rating_value: number;
          target_session_id: string;
        };
        Returns: string;
      };
      submit_organization_verification: {
        Args: {
          evidence: Json;
          request_kind: string;
          target_organization_id: string;
        };
        Returns: string;
      };
      update_moderation_case: {
        Args: {
          next_status: Database['public']['Enums']['moderation_case_status'];
          notes?: string;
          severity_value: number;
          target_case_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      confirmation_status: 'pending' | 'confirmed' | 'declined' | 'expired';
      data_request_status: 'requested' | 'processing' | 'ready' | 'expired' | 'cancelled';
      event_decision: 'passed' | 'saved';
      event_host_role: 'owner' | 'cohost' | 'checkin';
      event_message_kind: 'text' | 'system' | 'announcement';
      event_status:
        'draft' | 'published' | 'cancelled' | 'completed' | 'archived' | 'removed';
      event_visibility: 'campus' | 'public' | 'private';
      group_member_status: 'invited' | 'active' | 'left' | 'removed';
      group_status:
        'forming' | 'pending_confirmation' | 'confirmed' | 'cancelled' | 'completed';
      message_kind: 'text' | 'system';
      moderation_action_kind:
        | 'warn_user'
        | 'suspend_user'
        | 'ban_user'
        | 'remove_content'
        | 'restrict_organization'
        | 'cancel_event'
        | 'restore_content';
      moderation_case_status: 'open' | 'under_review' | 'resolved' | 'dismissed';
      notification_job_status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
      notification_platform: 'ios' | 'android';
      organization_membership_status: 'invited' | 'active' | 'removed';
      organization_role: 'owner' | 'admin' | 'event_manager' | 'moderator' | 'viewer';
      partnership_lead_status:
        'submitted' | 'reviewing' | 'contacted' | 'closed' | 'spam';
      referral_code_kind: 'user' | 'ambassador' | 'organization';
      referral_status: 'attributed' | 'qualified' | 'rewarded' | 'rejected';
      report_status: 'submitted' | 'under_review' | 'resolved' | 'dismissed';
      report_target: 'user' | 'message' | 'group' | 'event' | 'organization';
      rsvp_status: 'confirmed' | 'waitlisted' | 'pending' | 'rejected' | 'cancelled';
      session_status: 'scheduled' | 'cancelled' | 'completed';
      swipe_decision: 'pass' | 'interested';
      user_role: 'student' | 'host' | 'admin';
      verification_request_status:
        'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';
      waitlist_status: 'waiting' | 'matched' | 'withdrawn' | 'expired';
      xp_reason:
        | 'attendance_confirmed'
        | 'verified_checkin'
        | 'post_event_rating'
        | 'host_completion'
        | 'no_show'
        | 'late_cancellation'
        | 'admin_adjustment'
        | 'verified_event_checkin'
        | 'hosted_event'
        | 'qualified_referral';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {}
  },
  public: {
    Enums: {
      confirmation_status: ['pending', 'confirmed', 'declined', 'expired'],
      data_request_status: ['requested', 'processing', 'ready', 'expired', 'cancelled'],
      event_decision: ['passed', 'saved'],
      event_host_role: ['owner', 'cohost', 'checkin'],
      event_message_kind: ['text', 'system', 'announcement'],
      event_status: [
        'draft',
        'published',
        'cancelled',
        'completed',
        'archived',
        'removed'
      ],
      event_visibility: ['campus', 'public', 'private'],
      group_member_status: ['invited', 'active', 'left', 'removed'],
      group_status: [
        'forming',
        'pending_confirmation',
        'confirmed',
        'cancelled',
        'completed'
      ],
      message_kind: ['text', 'system'],
      moderation_action_kind: [
        'warn_user',
        'suspend_user',
        'ban_user',
        'remove_content',
        'restrict_organization',
        'cancel_event',
        'restore_content'
      ],
      moderation_case_status: ['open', 'under_review', 'resolved', 'dismissed'],
      notification_job_status: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
      notification_platform: ['ios', 'android'],
      organization_membership_status: ['invited', 'active', 'removed'],
      organization_role: ['owner', 'admin', 'event_manager', 'moderator', 'viewer'],
      partnership_lead_status: ['submitted', 'reviewing', 'contacted', 'closed', 'spam'],
      referral_code_kind: ['user', 'ambassador', 'organization'],
      referral_status: ['attributed', 'qualified', 'rewarded', 'rejected'],
      report_status: ['submitted', 'under_review', 'resolved', 'dismissed'],
      report_target: ['user', 'message', 'group', 'event', 'organization'],
      rsvp_status: ['confirmed', 'waitlisted', 'pending', 'rejected', 'cancelled'],
      session_status: ['scheduled', 'cancelled', 'completed'],
      swipe_decision: ['pass', 'interested'],
      user_role: ['student', 'host', 'admin'],
      verification_request_status: [
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'withdrawn'
      ],
      waitlist_status: ['waiting', 'matched', 'withdrawn', 'expired'],
      xp_reason: [
        'attendance_confirmed',
        'verified_checkin',
        'post_event_rating',
        'host_completion',
        'no_show',
        'late_cancellation',
        'admin_adjustment',
        'verified_event_checkin',
        'hosted_event',
        'qualified_referral'
      ]
    }
  }
} as const;
