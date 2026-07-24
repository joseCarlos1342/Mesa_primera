export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_kind: string
          actor_label: string | null
          admin_id: string | null
          after_state: Json | null
          before_state: Json | null
          context: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_kind?: string
          actor_label?: string | null
          admin_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          context?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_kind?: string
          actor_label?: string | null
          admin_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          context?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_dispute_case_events: {
        Row: {
          actor_id: string
          case_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          notes: string | null
          to_status: string
        }
        Insert: {
          actor_id: string
          case_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string
          case_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_dispute_case_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dispute_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "admin_dispute_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_dispute_cases: {
        Row: {
          assigned_to: string | null
          compensation_amount_cents: number | null
          compensation_approved_at: string | null
          compensation_approved_by: string | null
          compensation_ledger_id: string | null
          compensation_operation_id: string | null
          compensation_proposed_at: string | null
          compensation_proposed_by: string | null
          compensation_reason: string | null
          compensation_status: string | null
          compensation_user_id: string | null
          created_at: string
          description: string
          evidence_snapshot: Json
          game_id: string | null
          id: string
          investigation_type: string
          opened_by: string
          priority: string
          resolution_notes: string | null
          resolution_outcome: string | null
          resolved_at: string | null
          resolved_by: string | null
          room_id: string | null
          source: string
          status: string
          subject_user_ids: string[]
          support_ticket_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          compensation_amount_cents?: number | null
          compensation_approved_at?: string | null
          compensation_approved_by?: string | null
          compensation_ledger_id?: string | null
          compensation_operation_id?: string | null
          compensation_proposed_at?: string | null
          compensation_proposed_by?: string | null
          compensation_reason?: string | null
          compensation_status?: string | null
          compensation_user_id?: string | null
          created_at?: string
          description?: string
          evidence_snapshot?: Json
          game_id?: string | null
          id?: string
          investigation_type?: string
          opened_by: string
          priority?: string
          resolution_notes?: string | null
          resolution_outcome?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          room_id?: string | null
          source?: string
          status?: string
          subject_user_ids?: string[]
          support_ticket_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          compensation_amount_cents?: number | null
          compensation_approved_at?: string | null
          compensation_approved_by?: string | null
          compensation_ledger_id?: string | null
          compensation_operation_id?: string | null
          compensation_proposed_at?: string | null
          compensation_proposed_by?: string | null
          compensation_reason?: string | null
          compensation_status?: string | null
          compensation_user_id?: string | null
          created_at?: string
          description?: string
          evidence_snapshot?: Json
          game_id?: string | null
          id?: string
          investigation_type?: string
          opened_by?: string
          priority?: string
          resolution_notes?: string | null
          resolution_outcome?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          room_id?: string | null
          source?: string
          status?: string
          subject_user_ids?: string[]
          support_ticket_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_dispute_cases_compensation_approved_by_fkey"
            columns: ["compensation_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dispute_cases_compensation_ledger_id_fkey"
            columns: ["compensation_ledger_id"]
            isOneToOne: true
            referencedRelation: "ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dispute_cases_compensation_proposed_by_fkey"
            columns: ["compensation_proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dispute_cases_compensation_user_id_fkey"
            columns: ["compensation_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dispute_cases_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dispute_cases_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_mfa_recovery_codes: {
        Row: {
          admin_id: string
          batch_id: string
          code_hash: string
          consumed_at: string | null
          created_at: string
          id: string
        }
        Insert: {
          admin_id: string
          batch_id: string
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          admin_id?: string
          batch_id?: string
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_mfa_recovery_codes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anti_cheat_events: {
        Row: {
          created_at: string
          evidence: Json | null
          game_id: string | null
          id: string
          message_type: string
          phase: string | null
          player_id: string | null
          room_id: string | null
          session_id: string
          severity: string
          signal_type: string
        }
        Insert: {
          created_at?: string
          evidence?: Json | null
          game_id?: string | null
          id?: string
          message_type: string
          phase?: string | null
          player_id?: string | null
          room_id?: string | null
          session_id: string
          severity: string
          signal_type: string
        }
        Update: {
          created_at?: string
          evidence?: Json | null
          game_id?: string | null
          id?: string
          message_type?: string
          phase?: string | null
          player_id?: string | null
          room_id?: string | null
          session_id?: string
          severity?: string
          signal_type?: string
        }
        Relationships: []
      }
      bonus_claims: {
        Row: {
          bonus_amount_cents: number
          claimed_at: string
          id: string
          ledger_entry_id: string | null
          period: string
          rake_at_claim: number
          tier_id: number
          user_id: string
        }
        Insert: {
          bonus_amount_cents: number
          claimed_at?: string
          id?: string
          ledger_entry_id?: string | null
          period: string
          rake_at_claim: number
          tier_id: number
          user_id: string
        }
        Update: {
          bonus_amount_cents?: number
          claimed_at?: string
          id?: string
          ledger_entry_id?: string | null
          period?: string
          rake_at_claim?: number
          tier_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_claims_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "bonus_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_tiers: {
        Row: {
          active: boolean
          bonus_amount_cents: number
          created_at: string
          id: number
          min_rake_cents: number
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          bonus_amount_cents: number
          created_at?: string
          id?: number
          min_rake_cents: number
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          bonus_amount_cents?: number
          created_at?: string
          id?: number
          min_rake_cents?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      broadcast_deliveries: {
        Row: {
          broadcast_id: string
          id: string
          in_app_sent_at: string
          notification_id: string | null
          push_error: string | null
          push_failed_at: string | null
          push_queued_at: string | null
          push_sent_at: string | null
          user_id: string
        }
        Insert: {
          broadcast_id: string
          id?: string
          in_app_sent_at?: string
          notification_id?: string | null
          push_error?: string | null
          push_failed_at?: string | null
          push_queued_at?: string | null
          push_sent_at?: string | null
          user_id: string
        }
        Update: {
          broadcast_id?: string
          id?: string
          in_app_sent_at?: string
          notification_id?: string | null
          push_error?: string | null
          push_failed_at?: string | null
          push_queued_at?: string | null
          push_sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_deliveries_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcast_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_messages: {
        Row: {
          admin_id: string
          audience_count: number
          body: string
          created_at: string
          id: string
          title: string
          type: string
        }
        Insert: {
          admin_id: string
          audience_count?: number
          body: string
          created_at?: string
          id?: string
          title: string
          type: string
        }
        Update: {
          admin_id?: string
          audience_count?: number
          body?: string
          created_at?: string
          id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          game_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          game_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          game_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          observations: string | null
          proof_url: string | null
          rejected_reason: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          observations?: string | null
          proof_url?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          observations?: string | null
          proof_url?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          nickname_for_friend: string | null
          nickname_for_user: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          nickname_for_friend?: string | null
          nickname_for_user?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          nickname_for_friend?: string | null
          nickname_for_user?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_actions: {
        Row: {
          action_type: string
          amount: number | null
          created_at: string | null
          game_id: string
          id: string
          round_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          amount?: number | null
          created_at?: string | null
          game_id: string
          id?: string
          round_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          amount?: number | null
          created_at?: string | null
          game_id?: string
          id?: string
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_actions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_actions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_participants: {
        Row: {
          game_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          seat_number: number | null
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          seat_number?: number | null
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          seat_number?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_recovery_checkpoints: {
        Row: {
          captured_at: string
          checkpoint_version: number
          game_id: string
          private_state: Json
          reconnecting_user_ids: string[]
          room_id: string
          roster_user_ids: string[]
          state_hash: string
        }
        Insert: {
          captured_at?: string
          checkpoint_version: number
          game_id: string
          private_state: Json
          reconnecting_user_ids?: string[]
          room_id: string
          roster_user_ids: string[]
          state_hash: string
        }
        Update: {
          captured_at?: string
          checkpoint_version?: number
          game_id?: string
          private_state?: Json
          reconnecting_user_ids?: string[]
          room_id?: string
          roster_user_ids?: string[]
          state_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_recovery_checkpoints_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_recovery_incidents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          cause_code: string
          close_reason: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          detected_at: string
          game_id: string
          id: string
          recovered_at: string | null
          recovered_room_fence: number | null
          recovered_room_id: string | null
          recovered_room_lease_expires_at: string | null
          recovered_room_owner_id: string | null
          recovery_claim_expires_at: string | null
          recovery_claim_fence: number
          recovery_claim_owner_id: string | null
          recovery_claimed_at: string | null
          recovery_deadline_at: string
          resolution_reason: string | null
          resolved_at: string | null
          room_id: string
          status: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          cause_code: string
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          detected_at?: string
          game_id: string
          id?: string
          recovered_at?: string | null
          recovered_room_fence?: number | null
          recovered_room_id?: string | null
          recovered_room_lease_expires_at?: string | null
          recovered_room_owner_id?: string | null
          recovery_claim_expires_at?: string | null
          recovery_claim_fence?: number
          recovery_claim_owner_id?: string | null
          recovery_claimed_at?: string | null
          recovery_deadline_at: string
          resolution_reason?: string | null
          resolved_at?: string | null
          room_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          cause_code?: string
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          detected_at?: string
          game_id?: string
          id?: string
          recovered_at?: string | null
          recovered_room_fence?: number | null
          recovered_room_id?: string | null
          recovered_room_lease_expires_at?: string | null
          recovered_room_owner_id?: string | null
          recovery_claim_expires_at?: string | null
          recovery_claim_fence?: number
          recovery_claim_owner_id?: string | null
          recovery_claimed_at?: string | null
          recovery_deadline_at?: string
          resolution_reason?: string | null
          resolved_at?: string | null
          room_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_recovery_incidents_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_recovery_incidents_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_recovery_incidents_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_recovery_refunds: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          id: string
          incident_id: string
          ledger_id: string | null
          operation_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          id?: string
          incident_id: string
          ledger_id?: string | null
          operation_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          incident_id?: string
          ledger_id?: string | null
          operation_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_recovery_refunds_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "game_recovery_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_recovery_refunds_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      game_replays: {
        Row: {
          admin_timeline: Json | null
          created_at: string
          final_hands: Json
          game_id: string | null
          id: string
          players: Json
          pot_breakdown: Json
          rng_seed: string
          room_id: string | null
          round_number: number
          table_name: string | null
          timeline: Json
        }
        Insert: {
          admin_timeline?: Json | null
          created_at?: string
          final_hands?: Json
          game_id?: string | null
          id?: string
          players?: Json
          pot_breakdown?: Json
          rng_seed?: string
          room_id?: string | null
          round_number?: number
          table_name?: string | null
          timeline?: Json
        }
        Update: {
          admin_timeline?: Json | null
          created_at?: string
          final_hands?: Json
          game_id?: string | null
          id?: string
          players?: Json
          pot_breakdown?: Json
          rng_seed?: string
          room_id?: string | null
          round_number?: number
          table_name?: string | null
          timeline?: Json
        }
        Relationships: []
      }
      game_rounds: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          pot_amount: number | null
          round_number: number
          status: string | null
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          pot_amount?: number | null
          round_number: number
          status?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          pot_amount?: number | null
          round_number?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string | null
          finished_at: string | null
          id: string
          pause_reason: string | null
          paused_by: string | null
          started_at: string | null
          status: string | null
          table_id: string
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          pause_reason?: string | null
          paused_by?: string | null
          started_at?: string | null
          status?: string | null
          table_id: string
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          pause_reason?: string | null
          paused_by?: string | null
          started_at?: string | null
          status?: string | null
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_ticket_adjustments: {
        Row: {
          adjusted_by: string
          created_at: string
          delta_cents: number
          issue_ticket_id: string
          ledger_id: string
          reason: string
        }
        Insert: {
          adjusted_by: string
          created_at?: string
          delta_cents: number
          issue_ticket_id: string
          ledger_id: string
          reason: string
        }
        Update: {
          adjusted_by?: string
          created_at?: string
          delta_cents?: number
          issue_ticket_id?: string
          ledger_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_ticket_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_ticket_adjustments_issue_ticket_id_fkey"
            columns: ["issue_ticket_id"]
            isOneToOne: true
            referencedRelation: "issue_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_ticket_adjustments_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_ticket_attachments: {
        Row: {
          created_at: string
          description: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "issue_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_ticket_messages: {
        Row: {
          author_id: string | null
          created_at: string
          from_admin: boolean
          id: string
          message: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          from_admin?: boolean
          id?: string
          message: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          from_admin?: boolean
          id?: string
          message?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "issue_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_tickets: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          occurred_at: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          table_reference: string | null
          transaction_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          occurred_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          table_reference?: string | null
          transaction_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          occurred_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          table_reference?: string | null
          transaction_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger: {
        Row: {
          amount_cents: number
          approved_by: string | null
          balance_after_cents: number
          balance_before_cents: number | null
          counterpart_id: string | null
          created_at: string
          description: string | null
          direction: string
          game_id: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          sequence: number
          status: string | null
          table_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          approved_by?: string | null
          balance_after_cents: number
          balance_before_cents?: number | null
          counterpart_id?: string | null
          created_at?: string
          description?: string | null
          direction: string
          game_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          sequence?: number
          status?: string | null
          table_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          approved_by?: string | null
          balance_after_cents?: number
          balance_before_cents?: number | null
          counterpart_id?: string | null
          created_at?: string
          description?: string | null
          direction?: string
          game_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          sequence?: number
          status?: string | null
          table_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_counterpart_id_fkey"
            columns: ["counterpart_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          accepted_at: string | null
          attempts: number
          available_at: string
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          failed_at: string | null
          id: string
          last_error: string | null
          notification_id: string
          provider_message_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          attempts?: number
          available_at?: string
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          failed_at?: string | null
          id?: string
          last_error?: string | null
          notification_id: string
          provider_message_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          attempts?: number
          available_at?: string
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          failed_at?: string | null
          id?: string
          last_error?: string | null
          notification_id?: string
          provider_message_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          broadcast_id: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          broadcast_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          broadcast_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcast_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          best_streak: number | null
          chivos_count: number | null
          current_streak: number | null
          games_played: number | null
          games_won: number | null
          last_game_at: string | null
          losses: number | null
          primeras_count: number | null
          segundas_count: number | null
          total_lost_cents: number | null
          total_rake_paid_cents: number | null
          total_won_cents: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_streak?: number | null
          chivos_count?: number | null
          current_streak?: number | null
          games_played?: number | null
          games_won?: number | null
          last_game_at?: string | null
          losses?: number | null
          primeras_count?: number | null
          segundas_count?: number | null
          total_lost_cents?: number | null
          total_rake_paid_cents?: number | null
          total_won_cents?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_streak?: number | null
          chivos_count?: number | null
          current_streak?: number | null
          games_played?: number | null
          games_won?: number | null
          last_game_at?: string | null
          losses?: number | null
          primeras_count?: number | null
          segundas_count?: number | null
          total_lost_cents?: number | null
          total_rake_paid_cents?: number | null
          total_won_cents?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          created_at: string | null
          full_name: string | null
          has_pin: boolean | null
          id: string
          is_banned: boolean | null
          is_online: boolean
          last_device_id: string | null
          level: number | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string | null
          full_name?: string | null
          has_pin?: boolean | null
          id: string
          is_banned?: boolean | null
          is_online?: boolean
          last_device_id?: string | null
          level?: number | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string | null
          full_name?: string | null
          has_pin?: boolean | null
          id?: string
          is_banned?: boolean | null
          is_online?: boolean
          last_device_id?: string | null
          level?: number | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      server_alerts: {
        Row: {
          category: string
          created_at: string
          dedupe_key: string | null
          game_id: string | null
          id: string
          message: string | null
          metadata: Json | null
          player_id: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          room_id: string | null
          severity: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          dedupe_key?: string | null
          game_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          player_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          room_id?: string | null
          severity: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          dedupe_key?: string | null
          game_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          player_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          room_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          from_admin: boolean
          id: string
          is_resolved: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_admin?: boolean
          id?: string
          is_resolved?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_admin?: boolean
          id?: string
          is_resolved?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_support_messages_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          attachment_count: number
          closed_at: string | null
          closed_by: string | null
          closed_by_role: string | null
          created_at: string
          id: string
          last_message_at: string
          last_message_from: string
          last_message_preview: string | null
          message_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_count?: number
          closed_at?: string | null
          closed_by?: string | null
          closed_by_role?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_from?: string
          last_message_preview?: string | null
          message_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_count?: number
          closed_at?: string | null
          closed_by?: string | null
          closed_by_role?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_from?: string
          last_message_preview?: string | null
          message_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      table_help_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          room_id: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          room_id: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          room_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_help_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_help_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string | null
          created_by: string | null
          disabled_chips: number[]
          game_type: string
          id: string
          is_active: boolean | null
          lobby_slot: number | null
          max_players: number | null
          min_bet: number | null
          min_entry_cents: number
          min_pique_cents: number
          name: string
          sort_order: number
          table_category: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          disabled_chips?: number[]
          game_type: string
          id?: string
          is_active?: boolean | null
          lobby_slot?: number | null
          max_players?: number | null
          min_bet?: number | null
          min_entry_cents?: number
          min_pique_cents?: number
          name: string
          sort_order?: number
          table_category?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          disabled_chips?: number[]
          game_type?: string
          id?: string
          is_active?: boolean | null
          lobby_slot?: number | null
          max_players?: number | null
          min_bet?: number | null
          min_entry_cents?: number
          min_pique_cents?: number
          name?: string
          sort_order?: number
          table_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          id: string
          registered_at: string | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          registered_at?: string | null
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          registered_at?: string | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          buy_in: number
          created_at: string | null
          id: string
          name: string
          prize_pool_guaranteed: number | null
          starts_at: string
          status: string | null
        }
        Insert: {
          buy_in: number
          created_at?: string | null
          id?: string
          name: string
          prize_pool_guaranteed?: number | null
          starts_at: string
          status?: string | null
        }
        Update: {
          buy_in?: number
          created_at?: string | null
          id?: string
          name?: string
          prize_pool_guaranteed?: number | null
          starts_at?: string
          status?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          created_at: string | null
          id: string
          reference_id: string | null
          status: string | null
          type: string | null
          user_id: string | null
          wallet_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
          wallet_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          credential_id: string | null
          device_id: string
          fingerprint: Json | null
          id: string
          is_trusted: boolean | null
          last_login_at: string | null
          public_key: string | null
          sign_count: number | null
          transports: string[] | null
          trusted_until: string | null
          user_id: string
        }
        Insert: {
          credential_id?: string | null
          device_id: string
          fingerprint?: Json | null
          id?: string
          is_trusted?: boolean | null
          last_login_at?: string | null
          public_key?: string | null
          sign_count?: number | null
          transports?: string[] | null
          trusted_until?: string | null
          user_id: string
        }
        Update: {
          credential_id?: string | null
          device_id?: string
          fingerprint?: Json | null
          id?: string
          is_trusted?: boolean | null
          last_login_at?: string | null
          public_key?: string | null
          sign_count?: number | null
          transports?: string[] | null
          trusted_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sanctions: {
        Row: {
          applied_by: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          sanction_type: Database["public"]["Enums"]["sanction_type"]
          source_room_id: string | null
          starts_at: string
          user_id: string
        }
        Insert: {
          applied_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          sanction_type: Database["public"]["Enums"]["sanction_type"]
          source_room_id?: string | null
          starts_at?: string
          user_id: string
        }
        Update: {
          applied_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          sanction_type?: Database["public"]["Enums"]["sanction_type"]
          source_room_id?: string | null
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sanctions_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sanctions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sanctions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cents: number | null
          currency: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance_cents?: number | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance_cents?: number | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          amount_cents: number
          bank_info: string | null
          created_at: string
          id: string
          observations: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          bank_info?: string | null
          created_at?: string
          id?: string
          observations?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          bank_info?: string | null
          created_at?: string
          id?: string
          observations?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_game_recovery_incident: {
        Args: { p_incident_id: string }
        Returns: Json
      }
      admin_adjust_user_balance: {
        Args: { p_delta_cents: number; p_reason: string; p_user_id: string }
        Returns: Json
      }
      append_issue_ticket_message: {
        Args: { p_from_admin?: boolean; p_message: string; p_ticket_id: string }
        Returns: Json
      }
      append_support_message: {
        Args: { p_from_admin?: boolean; p_message: string; p_ticket_id: string }
        Returns: Json
      }
      approve_admin_investigation_compensation: {
        Args: { p_case_id: string }
        Returns: Json
      }
      award_pot:
        | {
            Args: {
              p_game_id: string
              p_payout: number
              p_pot_details?: Json
              p_rake: number
              p_table_id?: string
              p_winner_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_game_id: string
              p_payout_cents: number
              p_rake_cents: number
              p_winner_id: string
            }
            Returns: Json
          }
      bump_passkey_sign_count: {
        Args: { p_credential_id: string; p_new_count: number }
        Returns: undefined
      }
      cancel_admin_investigation_compensation: {
        Args: { p_case_id: string; p_reason: string }
        Returns: Json
      }
      check_account_eligibility: { Args: { p_user_id: string }; Returns: Json }
      check_phone_exists: { Args: { p_phone: string }; Returns: boolean }
      check_table_access: { Args: { p_user_id: string }; Returns: Json }
      claim_bonus: { Args: { p_tier_id: number }; Returns: Json }
      claim_game_recovery_incident: {
        Args: { p_game_id: string; p_owner_id: string }
        Returns: Json
      }
      claim_notification_outbox: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          body: string
          claim_token: string
          data: Json
          id: string
          notification_id: string
          title: string
          user_id: string
        }[]
      }
      close_game_recovery_incident: {
        Args: { p_incident_id: string; p_reason: string }
        Returns: Json
      }
      close_issue_ticket: { Args: { p_ticket_id: string }; Returns: Json }
      close_support_ticket: {
        Args: { p_role?: string; p_ticket_id: string }
        Returns: Json
      }
      create_admin_investigation: {
        Args: {
          p_description: string
          p_evidence?: Json
          p_game_id?: string
          p_investigation_type: string
          p_priority: string
          p_room_id?: string
          p_source: string
          p_subject_user_ids?: string[]
          p_title: string
        }
        Returns: Json
      }
      create_support_issue: {
        Args: {
          p_category: string
          p_message: string
          p_occurred_at?: string
          p_table_reference?: string
          p_transaction_reference?: string
        }
        Returns: Json
      }
      custom_is_admin: { Args: never; Returns: boolean }
      detect_potential_collusion: {
        Args: { threshold?: number }
        Returns: {
          games_together: number
          overlap_pct: number
          player_1: string
          player_2: string
          total_games_p1: number
          total_games_p2: number
        }[]
      }
      dismiss_admin_investigation: {
        Args: { p_case_id: string; p_reason: string }
        Returns: Json
      }
      expire_game_recovery_incident: {
        Args: { p_game_id: string; p_refunds: Json }
        Returns: Json
      }
      get_active_sanctions: {
        Args: { p_user_id: string }
        Returns: {
          applied_by: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          sanction_type: Database["public"]["Enums"]["sanction_type"]
          source_room_id: string | null
          starts_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_sanctions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_admin_ledger_summary: {
        Args: never
        Returns: {
          balance: number
          display_name: string
          has_discrepancy: boolean
          id: string
          last_activity: string
          total_credits: number
          total_debits: number
          username: string
        }[]
      }
      get_admin_replay_detail: {
        Args: { p_game_id: string }
        Returns: {
          admin_timeline: Json
          created_at: string
          final_hands: Json
          game_id: string
          id: string
          players: Json
          pot_breakdown: Json
          rng_seed: string
          timeline: Json
        }[]
      }
      get_admin_replays: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          game_id: string
          played_at: string
          players: Json
          total_pot: number
          total_rake: number
          winner_id: string
        }[]
      }
      get_admin_replays_summary: {
        Args: never
        Returns: {
          total_games_with_replay: number
          total_replay_rake_cents: number
          total_unique_replay_players: number
        }[]
      }
      get_bonus_status: { Args: { p_user_id?: string }; Returns: Json }
      get_leaderboard: {
        Args: { p_category: string; p_period: string }
        Returns: {
          avatar_url: string
          score: number
          user_id: string
          username: string
        }[]
      }
      get_ledger_net_balance: { Args: never; Returns: number }
      get_lobby_tables: {
        Args: never
        Returns: {
          disabled_chips: number[]
          game_type: string
          id: string
          lobby_slot: number
          max_players: number
          min_entry_cents: number
          min_pique_cents: number
          name: string
          sort_order: number
          table_category: string
        }[]
      }
      get_own_profile_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_player_replay_detail: {
        Args: { p_game_id: string }
        Returns: {
          created_at: string
          final_hands: Json
          game_id: string
          id: string
          players: Json
          pot_breakdown: Json
          timeline: Json
        }[]
      }
      get_player_replays:
        | {
            Args: {
              p_from?: string
              p_limit?: number
              p_to?: string
              p_user_id: string
            }
            Returns: {
              game_id: string
              is_winner: boolean
              net_result: number
              played_at: string
              players: Json
              total_pot: number
            }[]
          }
        | {
            Args: { p_limit?: number; p_user_id: string }
            Returns: {
              game_id: string
              is_winner: boolean
              net_result: number
              played_at: string
              players: Json
              total_pot: number
            }[]
          }
      get_player_replays_by_mesa:
        | {
            Args: {
              p_from?: string
              p_limit?: number
              p_to?: string
              p_user_id: string
            }
            Returns: {
              first_played_at: string
              game_count: number
              last_played_at: string
              players: Json
              room_id: string
              table_name: string
              total_net_result: number
            }[]
          }
        | {
            Args: { p_limit?: number; p_user_id: string }
            Returns: {
              first_played_at: string
              game_count: number
              last_played_at: string
              players: Json
              room_id: string
              table_name: string
              total_net_result: number
            }[]
          }
      get_player_replays_for_room:
        | {
            Args: { p_limit?: number; p_room_id: string; p_user_id: string }
            Returns: {
              game_id: string
              is_winner: boolean
              net_result: number
              played_at: string
              players: Json
              round_number: number
              total_pot: number
            }[]
          }
        | {
            Args: {
              p_from?: string
              p_limit?: number
              p_room_id: string
              p_to?: string
              p_user_id: string
            }
            Returns: {
              game_id: string
              is_winner: boolean
              net_result: number
              played_at: string
              players: Json
              round_number: number
              total_pot: number
            }[]
          }
      get_replay_ledger: {
        Args: { p_game_id: string }
        Returns: {
          amount_cents: number
          balance_after_cents: number
          created_at: string
          description: string
          direction: string
          id: string
          metadata: Json
          type: string
          user_id: string
        }[]
      }
      get_total_users_balance: { Args: never; Returns: number }
      get_user_balance: { Args: { p_user_id: string }; Returns: number }
      get_user_game_ids: { Args: never; Returns: string[] }
      get_vault_status: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_device_trusted: {
        Args: { p_device_id: string; p_phone: string }
        Returns: boolean
      }
      list_admin_recovery_incidents: {
        Args: never
        Returns: {
          cause_code: string
          detected_at: string
          game_id: string
          refunds_completed_count: number
          refunds_total_count: number
          resolution_reason: string
          resolved_at: string
          room_id: string
          status: string
        }[]
      }
      list_admin_recovery_incidents_export: {
        Args: {
          p_cause_code?: string
          p_detected_from?: string
          p_detected_to?: string
          p_query?: string
          p_status?: string
        }
        Returns: {
          cause_code: string
          detected_at: string
          game_id: string
          refunds_completed_count: number
          refunds_total_count: number
          resolution_reason: string
          resolved_at: string
          room_id: string
          status: string
        }[]
      }
      list_admin_recovery_incidents_v2: {
        Args: {
          p_cause_code?: string
          p_cursor_detected_at?: string
          p_cursor_game_id?: string
          p_detected_from?: string
          p_detected_to?: string
          p_limit?: number
          p_query?: string
          p_status?: string
        }
        Returns: {
          cause_code: string
          detected_at: string
          game_id: string
          refunds_completed_count: number
          refunds_total_count: number
          replay_available: boolean
          resolution_reason: string
          resolved_at: string
          room_id: string
          status: string
          total_count: number
        }[]
      }
      list_admin_recovery_refunds: {
        Args: { p_game_id: string }
        Returns: {
          amount_cents: number
          completed_at: string
          ledger_id: string
          refund_id: string
          status: string
          user_id: string
        }[]
      }
      load_pending_game_recovery_checkpoints: {
        Args: never
        Returns: {
          checkpoint_version: number
          game_id: string
          private_state: Json
          recovery_deadline_at: string
          room_id: string
          roster_user_ids: string[]
          state_hash: string
        }[]
      }
      load_pending_game_recovery_checkpoints_v2: {
        Args: never
        Returns: {
          checkpoint_version: number
          game_id: string
          private_state: Json
          recovered_room_id: string
          recovery_deadline_at: string
          room_id: string
          roster_user_ids: string[]
          state_hash: string
        }[]
      }
      lookup_passkey_device: {
        Args: { p_credential_id: string; p_phone: string }
        Returns: {
          device_id: string
          public_key: string
          sign_count: number
          user_id: string
        }[]
      }
      lookup_user_by_phone: { Args: { p_phone: string }; Returns: Json }
      mark_game_recovery_incident_manual_review: {
        Args: { p_game_id: string; p_reason: string }
        Returns: Json
      }
      notify_admins: {
        Args: { p_body: string; p_data?: Json; p_title: string; p_type: string }
        Returns: number
      }
      notify_social_user: {
        Args: { p_type: string; p_user_id: string }
        Returns: string
      }
      notify_user: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      open_game_recovery_incident: {
        Args: {
          p_cause_code: string
          p_detected_at: string
          p_game_id: string
          p_room_id: string
        }
        Returns: Json
      }
      process_admin_transaction: {
        Args: { p_request_id: string; p_status: string }
        Returns: Json
      }
      process_ledger_entry: {
        Args: {
          p_amount_cents: number
          p_approved_by?: string
          p_counterpart_id?: string
          p_description?: string
          p_direction: string
          p_game_id?: string
          p_metadata?: Json
          p_reference_id?: string
          p_table_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      propose_admin_investigation_compensation: {
        Args: {
          p_amount_cents: number
          p_case_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      reconcile_game_recovery_refund: {
        Args: { p_reason: string; p_refund_id: string }
        Returns: Json
      }
      record_ledger_entry: {
        Args: {
          p_amount_cents: number
          p_direction: string
          p_game_id: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      register_trusted_device: {
        Args: { p_device_id: string; p_trust_days?: number }
        Returns: undefined
      }
      renew_game_recovery_room_mapping_lease: {
        Args: {
          p_claim_fence: number
          p_game_id: string
          p_owner_id: string
          p_recovered_room_id: string
        }
        Returns: Json
      }
      resolve_admin_investigation: {
        Args: { p_case_id: string; p_notes: string; p_outcome: string }
        Returns: Json
      }
      resolve_game_recovery_incident: {
        Args: {
          p_claim_fence: number
          p_game_id: string
          p_owner_id: string
          p_recovered_room_id: string
        }
        Returns: Json
      }
      resolve_player_recovery_room: {
        Args: { p_original_room_id: string }
        Returns: {
          recovered_room_id: string
          recovery_deadline_at: string
          status: string
        }[]
      }
      resolve_support_issue_adjustment: {
        Args: { p_delta_cents: number; p_reason: string; p_ticket_id: string }
        Returns: Json
      }
      save_game_recovery_checkpoint: {
        Args: {
          p_checkpoint_version: number
          p_game_id: string
          p_private_state: Json
          p_room_id: string
          p_roster_user_ids: string[]
          p_state_hash: string
        }
        Returns: Json
      }
      save_game_recovery_room_mapping:
        | {
            Args: {
              p_game_id: string
              p_original_room_id: string
              p_recovered_room_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_game_id: string
              p_original_room_id: string
              p_owner_id: string
              p_recovered_room_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_claim_fence: number
              p_game_id: string
              p_original_room_id: string
              p_owner_id: string
              p_recovered_room_id: string
            }
            Returns: Json
          }
      search_admin_replays: {
        Args: { p_identifier: string }
        Returns: {
          created_at: string
          game_id: string
          id: string
          rng_seed: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_admin_investigation: { Args: { p_case_id: string }; Returns: Json }
      transfer_between_players: {
        Args: {
          p_amount_cents: number
          p_description?: string
          p_recipient_id: string
          p_sender_id?: string
        }
        Returns: Json
      }
      transfer_pique_banda: {
        Args: {
          p_game_id?: string
          p_losers: Json
          p_metadata?: Json
          p_transfer_id: string
          p_winner_id: string
        }
        Returns: Json
      }
      user_has_pin: { Args: { p_phone: string }; Returns: boolean }
      uuid_generate_v4: { Args: never; Returns: string }
    }
    Enums: {
      sanction_type: "full_suspension" | "game_suspension" | "permanent_ban"
      user_role: "player" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      sanction_type: ["full_suspension", "game_suspension", "permanent_ban"],
      user_role: ["player", "admin"],
    },
  },
} as const
