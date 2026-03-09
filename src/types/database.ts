/**
 * Supabase Database type definitions for TokenMart.
 * Matches schema from supabase/migrations/*.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          email_verified: boolean;
          email_verification_token: string | null;
          display_name: string | null;
          supabase_auth_user_id: string | null;
          auth_provider: string;
          last_login_at: string | null;
          role: "user" | "admin" | "super_admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          email_verified?: boolean;
          email_verification_token?: string | null;
          display_name?: string | null;
          supabase_auth_user_id?: string | null;
          auth_provider?: string;
          last_login_at?: string | null;
          role?: "user" | "admin" | "super_admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          email_verified?: boolean;
          email_verification_token?: string | null;
          display_name?: string | null;
          supabase_auth_user_id?: string | null;
          auth_provider?: string;
          last_login_at?: string | null;
          role?: "user" | "admin" | "super_admin";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agents: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          harness: string;
          owner_account_id: string | null;
          bootstrap_account_id: string | null;
          claimed: boolean;
          claim_code: string | null;
          status: string;
          lifecycle_state: string;
          bootstrap_expires_at: string | null;
          connected_at: string | null;
          claimed_at: string | null;
          trust_tier: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          harness?: string;
          owner_account_id?: string | null;
          bootstrap_account_id?: string | null;
          claimed?: boolean;
          claim_code?: string | null;
          status?: string;
          lifecycle_state?: string;
          bootstrap_expires_at?: string | null;
          connected_at?: string | null;
          claimed_at?: string | null;
          trust_tier?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          harness?: string;
          owner_account_id?: string | null;
          bootstrap_account_id?: string | null;
          claimed?: boolean;
          claim_code?: string | null;
          status?: string;
          lifecycle_state?: string;
          bootstrap_expires_at?: string | null;
          connected_at?: string | null;
          claimed_at?: string | null;
          trust_tier?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agents_owner_account_id_fkey";
            columns: ["owner_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agents_bootstrap_account_id_fkey";
            columns: ["bootstrap_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      openclaw_bridge_instances: {
        Row: {
          id: string;
          agent_id: string;
          workspace_fingerprint: string;
          bridge_mode: string;
          bridge_version: string;
          profile_name: string;
          workspace_path: string;
          openclaw_home: string;
          openclaw_version: string | null;
          platform: string;
          cron_health: string;
          hook_health: string;
          runtime_online: boolean;
          last_attach_at: string;
          last_pulse_at: string | null;
          last_self_check_at: string | null;
          last_manifest_version: string | null;
          last_manifest_checksum: string | null;
          local_asset_path: string | null;
          local_asset_checksum: string | null;
          update_available: boolean;
          update_required: boolean;
          last_update_at: string | null;
          last_update_error: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          workspace_fingerprint: string;
          bridge_mode?: string;
          bridge_version: string;
          profile_name: string;
          workspace_path: string;
          openclaw_home: string;
          openclaw_version?: string | null;
          platform?: string;
          cron_health?: string;
          hook_health?: string;
          runtime_online?: boolean;
          last_attach_at?: string;
          last_pulse_at?: string | null;
          last_self_check_at?: string | null;
          last_manifest_version?: string | null;
          last_manifest_checksum?: string | null;
          local_asset_path?: string | null;
          local_asset_checksum?: string | null;
          update_available?: boolean;
          update_required?: boolean;
          last_update_at?: string | null;
          last_update_error?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          workspace_fingerprint?: string;
          bridge_mode?: string;
          bridge_version?: string;
          profile_name?: string;
          workspace_path?: string;
          openclaw_home?: string;
          openclaw_version?: string | null;
          platform?: string;
          cron_health?: string;
          hook_health?: string;
          runtime_online?: boolean;
          last_attach_at?: string;
          last_pulse_at?: string | null;
          last_self_check_at?: string | null;
          last_manifest_version?: string | null;
          last_manifest_checksum?: string | null;
          local_asset_path?: string | null;
          local_asset_checksum?: string | null;
          update_available?: boolean;
          update_required?: boolean;
          last_update_at?: string | null;
          last_update_error?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "openclaw_bridge_instances_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      auth_api_keys: {
        Row: {
          id: string;
          key_hash: string;
          key_prefix: string;
          label: string | null;
          agent_id: string | null;
          account_id: string | null;
          permissions: string[];
          last_used_at: string | null;
          expires_at: string | null;
          revoked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          key_hash: string;
          key_prefix: string;
          label?: string | null;
          agent_id?: string | null;
          account_id?: string | null;
          permissions?: string[];
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          label?: string | null;
          agent_id?: string | null;
          account_id?: string | null;
          permissions?: string[];
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "auth_api_keys_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auth_api_keys_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_tokens: {
        Row: {
          id: string;
          agent_id: string;
          token_hash: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          token_hash: string;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          token_hash?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "identity_tokens_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_challenges: {
        Row: {
          id: string;
          agent_id: string;
          challenge_type: string;
          challenge_data: Json;
          solved: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          challenge_type?: string;
          challenge_data: Json;
          solved?: boolean;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          challenge_type?: string;
          challenge_data?: Json;
          solved?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_challenges_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          account_id: string;
          refresh_token_hash: string;
          user_agent: string | null;
          ip_address: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          refresh_token_hash: string;
          user_agent?: string | null;
          ip_address?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          refresh_token_hash?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      heartbeats: {
        Row: {
          id: string;
          agent_id: string;
          nonce: string;
          prev_nonce: string | null;
          chain_length: number;
          timestamp: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          nonce: string;
          prev_nonce?: string | null;
          chain_length?: number;
          timestamp?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          nonce?: string;
          prev_nonce?: string | null;
          chain_length?: number;
          timestamp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "heartbeats_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      micro_challenges: {
        Row: {
          id: string;
          agent_id: string;
          challenge_id: string;
          issued_at: string;
          deadline_seconds: number;
          responded_at: string | null;
          latency_ms: number | null;
        };
        Insert: {
          id?: string;
          agent_id: string;
          challenge_id: string;
          issued_at?: string;
          deadline_seconds?: number;
          responded_at?: string | null;
          latency_ms?: number | null;
        };
        Update: {
          id?: string;
          agent_id?: string;
          challenge_id?: string;
          issued_at?: string;
          deadline_seconds?: number;
          responded_at?: string | null;
          latency_ms?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "micro_challenges_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      daemon_scores: {
        Row: {
          agent_id: string;
          score: number;
          heartbeat_regularity: number;
          challenge_response_rate: number;
          challenge_median_latency_ms: number | null;
          circadian_score: number;
          last_chain_length: number;
          score_version: string;
          runtime_mode: string;
          declared_interval_seconds: number | null;
          heartbeat_sample_count: number;
          challenge_sample_count: number;
          cadence_score: number;
          challenge_reliability_score: number;
          latency_score: number;
          chain_score: number;
          service_health_score: number;
          orchestration_score: number;
          decomposition_quality_score: number;
          score_confidence: number;
          metrics: Json;
          updated_at: string;
        };
        Insert: {
          agent_id: string;
          score?: number;
          heartbeat_regularity?: number;
          challenge_response_rate?: number;
          challenge_median_latency_ms?: number | null;
          circadian_score?: number;
          last_chain_length?: number;
          score_version?: string;
          runtime_mode?: string;
          declared_interval_seconds?: number | null;
          heartbeat_sample_count?: number;
          challenge_sample_count?: number;
          cadence_score?: number;
          challenge_reliability_score?: number;
          latency_score?: number;
          chain_score?: number;
          service_health_score?: number;
          orchestration_score?: number;
          decomposition_quality_score?: number;
          score_confidence?: number;
          metrics?: Json;
          updated_at?: string;
        };
        Update: {
          agent_id?: string;
          score?: number;
          heartbeat_regularity?: number;
          challenge_response_rate?: number;
          challenge_median_latency_ms?: number | null;
          circadian_score?: number;
          last_chain_length?: number;
          score_version?: string;
          runtime_mode?: string;
          declared_interval_seconds?: number | null;
          heartbeat_sample_count?: number;
          challenge_sample_count?: number;
          cadence_score?: number;
          challenge_reliability_score?: number;
          latency_score?: number;
          chain_score?: number;
          service_health_score?: number;
          orchestration_score?: number;
          decomposition_quality_score?: number;
          score_confidence?: number;
          metrics?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daemon_scores_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: true;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      credits: {
        Row: {
          id: string;
          agent_id: string;
          account_id: string | null;
          wallet_address: string;
          balance: string;
          total_purchased: string;
          total_earned: string;
          total_spent: string;
          total_transferred_in: string;
          total_transferred_out: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          account_id?: string | null;
          wallet_address?: string;
          balance?: string;
          total_purchased?: string;
          total_earned?: string;
          total_spent?: string;
          total_transferred_in?: string;
          total_transferred_out?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          account_id?: string | null;
          wallet_address?: string;
          balance?: string;
          total_purchased?: string;
          total_earned?: string;
          total_spent?: string;
          total_transferred_in?: string;
          total_transferred_out?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credits_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credits_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      account_credit_wallets: {
        Row: {
          id: string;
          account_id: string;
          wallet_address: string;
          balance: string;
          total_transferred_in: string;
          total_transferred_out: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          wallet_address: string;
          balance?: string;
          total_transferred_in?: string;
          total_transferred_out?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          wallet_address?: string;
          balance?: string;
          total_transferred_in?: string;
          total_transferred_out?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_credit_wallets_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      tokenhall_api_keys: {
        Row: {
          id: string;
          key_hash: string;
          key_prefix: string;
          label: string | null;
          agent_id: string | null;
          account_id: string | null;
          is_management_key: boolean;
          credit_limit: string | null;
          rate_limit_rpm: number | null;
          last_used_at: string | null;
          expires_at: string | null;
          revoked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          key_hash: string;
          key_prefix: string;
          label?: string | null;
          agent_id?: string | null;
          account_id?: string | null;
          is_management_key?: boolean;
          credit_limit?: string | null;
          rate_limit_rpm?: number | null;
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          label?: string | null;
          agent_id?: string | null;
          account_id?: string | null;
          is_management_key?: boolean;
          credit_limit?: string | null;
          rate_limit_rpm?: number | null;
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tokenhall_api_keys_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_transactions: {
        Row: {
          id: string;
          agent_id: string;
          type: string;
          amount: string;
          description: string | null;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          type: string;
          amount: string;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          type?: string;
          amount?: string;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_transactions_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_transfers: {
        Row: {
          id: string;
          from_wallet_address: string;
          to_wallet_address: string;
          from_owner_type: "account" | "agent";
          to_owner_type: "account" | "agent";
          from_account_id: string | null;
          to_account_id: string | null;
          from_agent_id: string | null;
          to_agent_id: string | null;
          amount: string;
          memo: string | null;
          initiated_by_type: "account" | "agent" | "system";
          initiated_by_account_id: string | null;
          initiated_by_agent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_wallet_address: string;
          to_wallet_address: string;
          from_owner_type: "account" | "agent";
          to_owner_type: "account" | "agent";
          from_account_id?: string | null;
          to_account_id?: string | null;
          from_agent_id?: string | null;
          to_agent_id?: string | null;
          amount: string;
          memo?: string | null;
          initiated_by_type: "account" | "agent" | "system";
          initiated_by_account_id?: string | null;
          initiated_by_agent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_wallet_address?: string;
          to_wallet_address?: string;
          from_owner_type?: "account" | "agent";
          to_owner_type?: "account" | "agent";
          from_account_id?: string | null;
          to_account_id?: string | null;
          from_agent_id?: string | null;
          to_agent_id?: string | null;
          amount?: string;
          memo?: string | null;
          initiated_by_type?: "account" | "agent" | "system";
          initiated_by_account_id?: string | null;
          initiated_by_agent_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_transfers_from_account_id_fkey";
            columns: ["from_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_transfers_from_agent_id_fkey";
            columns: ["from_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_transfers_initiated_by_account_id_fkey";
            columns: ["initiated_by_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_transfers_initiated_by_agent_id_fkey";
            columns: ["initiated_by_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_transfers_to_account_id_fkey";
            columns: ["to_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_transfers_to_agent_id_fkey";
            columns: ["to_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_keys: {
        Row: {
          id: string;
          agent_id: string | null;
          account_id: string | null;
          provider: string;
          encrypted_key: string;
          iv: string;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id?: string | null;
          account_id?: string | null;
          provider: string;
          encrypted_key: string;
          iv: string;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string | null;
          account_id?: string | null;
          provider?: string;
          encrypted_key?: string;
          iv?: string;
          label?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      models: {
        Row: {
          id: string;
          model_id: string;
          name: string;
          provider: string;
          input_price_per_million: string;
          output_price_per_million: string;
          context_length: number | null;
          max_output_tokens: number | null;
          supports_streaming: boolean;
          supports_tools: boolean;
          supports_vision: boolean;
          active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          model_id: string;
          name: string;
          provider: string;
          input_price_per_million: string;
          output_price_per_million: string;
          context_length?: number | null;
          max_output_tokens?: number | null;
          supports_streaming?: boolean;
          supports_tools?: boolean;
          supports_vision?: boolean;
          active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          model_id?: string;
          name?: string;
          provider?: string;
          input_price_per_million?: string;
          output_price_per_million?: string;
          context_length?: number | null;
          max_output_tokens?: number | null;
          supports_streaming?: boolean;
          supports_tools?: boolean;
          supports_vision?: boolean;
          active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          agent_id: string;
          tokenhall_key_id: string;
          model_id: string;
          provider: string;
          input_tokens: number;
          output_tokens: number;
          total_cost: string;
          latency_ms: number | null;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          tokenhall_key_id: string;
          model_id: string;
          provider: string;
          input_tokens: number;
          output_tokens: number;
          total_cost: string;
          latency_ms?: number | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          tokenhall_key_id?: string;
          model_id?: string;
          provider?: string;
          input_tokens?: number;
          output_tokens?: number;
          total_cost?: string;
          latency_ms?: number | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generations_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: string;
          priority: number;
          passing_spec: string | null;
          credit_reward: string;
          created_by: string | null;
          assigned_to: string | null;
          methodology_version: string;
          metadata: Json;
          input_spec: Json;
          output_spec: Json;
          retry_policy: Json;
          verification_method: string | null;
          verification_target: string | null;
          estimated_minutes: number | null;
          actual_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: string;
          priority?: number;
          passing_spec?: string | null;
          credit_reward?: string;
          created_by?: string | null;
          assigned_to?: string | null;
          methodology_version?: string;
          metadata?: Json;
          input_spec?: Json;
          output_spec?: Json;
          retry_policy?: Json;
          verification_method?: string | null;
          verification_target?: string | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          priority?: number;
          passing_spec?: string | null;
          credit_reward?: string;
          created_by?: string | null;
          assigned_to?: string | null;
          methodology_version?: string;
          metadata?: Json;
          input_spec?: Json;
          output_spec?: Json;
          retry_policy?: Json;
          verification_method?: string | null;
          verification_target?: string | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          task_id: string;
          parent_goal_id: string | null;
          path: string;
          title: string;
          description: string | null;
          status: string;
          passing_spec: string | null;
          requires_all_subgoals: boolean;
          assigned_agent_id: string | null;
          credit_reward: string;
          metadata: Json;
          evidence: Json;
          input_spec: Json;
          output_spec: Json;
          retry_policy: Json;
          verification_method: string | null;
          verification_target: string | null;
          orchestration_role: string;
          node_type: string;
          blocked_reason: string | null;
          completion_confidence: number | null;
          estimated_minutes: number | null;
          actual_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          parent_goal_id?: string | null;
          path?: string;
          title: string;
          description?: string | null;
          status?: string;
          passing_spec?: string | null;
          requires_all_subgoals?: boolean;
          assigned_agent_id?: string | null;
          credit_reward?: string;
          metadata?: Json;
          evidence?: Json;
          input_spec?: Json;
          output_spec?: Json;
          retry_policy?: Json;
          verification_method?: string | null;
          verification_target?: string | null;
          orchestration_role?: string;
          node_type?: string;
          blocked_reason?: string | null;
          completion_confidence?: number | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          parent_goal_id?: string | null;
          path?: string;
          title?: string;
          description?: string | null;
          status?: string;
          passing_spec?: string | null;
          requires_all_subgoals?: boolean;
          assigned_agent_id?: string | null;
          credit_reward?: string;
          metadata?: Json;
          evidence?: Json;
          input_spec?: Json;
          output_spec?: Json;
          retry_policy?: Json;
          verification_method?: string | null;
          verification_target?: string | null;
          orchestration_role?: string;
          node_type?: string;
          blocked_reason?: string | null;
          completion_confidence?: number | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_assigned_agent_id_fkey";
            columns: ["assigned_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goals_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      goal_dependencies: {
        Row: {
          id: string;
          goal_id: string;
          depends_on_goal_id: string;
          dependency_kind: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          depends_on_goal_id: string;
          dependency_kind?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          depends_on_goal_id?: string;
          dependency_kind?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goal_dependencies_depends_on_goal_id_fkey";
            columns: ["depends_on_goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goal_dependencies_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      execution_plans: {
        Row: {
          id: string;
          task_id: string;
          created_by: string | null;
          agent_id: string | null;
          status: string;
          methodology_version: string;
          summary: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          created_by?: string | null;
          agent_id?: string | null;
          status?: string;
          methodology_version?: string;
          summary?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          created_by?: string | null;
          agent_id?: string | null;
          status?: string;
          methodology_version?: string;
          summary?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "execution_plans_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_plans_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_plans_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      execution_plan_nodes: {
        Row: {
          id: string;
          plan_id: string;
          goal_id: string | null;
          parent_node_id: string | null;
          node_key: string;
          title: string;
          description: string | null;
          node_type: string;
          orchestration_role: string;
          status: string;
          assigned_agent_id: string | null;
          priority: number;
          confidence: number | null;
          budget_credits: string | null;
          budget_minutes: number | null;
          actual_minutes: number | null;
          passing_spec: string | null;
          evidence: Json;
          input_spec: Json;
          output_spec: Json;
          retry_policy: Json;
          verification_method: string | null;
          verification_target: string | null;
          rework_count: number;
          handoff_count: number;
          successful_handoff_count: number;
          duplicate_overlap_score: number | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          goal_id?: string | null;
          parent_node_id?: string | null;
          node_key: string;
          title: string;
          description?: string | null;
          node_type?: string;
          orchestration_role?: string;
          status?: string;
          assigned_agent_id?: string | null;
          priority?: number;
          confidence?: number | null;
          budget_credits?: string | null;
          budget_minutes?: number | null;
          actual_minutes?: number | null;
          passing_spec?: string | null;
          evidence?: Json;
          input_spec?: Json;
          output_spec?: Json;
          retry_policy?: Json;
          verification_method?: string | null;
          verification_target?: string | null;
          rework_count?: number;
          handoff_count?: number;
          successful_handoff_count?: number;
          duplicate_overlap_score?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          goal_id?: string | null;
          parent_node_id?: string | null;
          node_key?: string;
          title?: string;
          description?: string | null;
          node_type?: string;
          orchestration_role?: string;
          status?: string;
          assigned_agent_id?: string | null;
          priority?: number;
          confidence?: number | null;
          budget_credits?: string | null;
          budget_minutes?: number | null;
          actual_minutes?: number | null;
          passing_spec?: string | null;
          evidence?: Json;
          input_spec?: Json;
          output_spec?: Json;
          retry_policy?: Json;
          verification_method?: string | null;
          verification_target?: string | null;
          rework_count?: number;
          handoff_count?: number;
          successful_handoff_count?: number;
          duplicate_overlap_score?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "execution_plan_nodes_assigned_agent_id_fkey";
            columns: ["assigned_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_plan_nodes_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_plan_nodes_parent_node_id_fkey";
            columns: ["parent_node_id"];
            isOneToOne: false;
            referencedRelation: "execution_plan_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_plan_nodes_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "execution_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      execution_plan_edges: {
        Row: {
          id: string;
          plan_id: string;
          from_node_id: string;
          to_node_id: string;
          edge_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          from_node_id: string;
          to_node_id: string;
          edge_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          from_node_id?: string;
          to_node_id?: string;
          edge_type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "execution_plan_edges_from_node_id_fkey";
            columns: ["from_node_id"];
            isOneToOne: false;
            referencedRelation: "execution_plan_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_plan_edges_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "execution_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_plan_edges_to_node_id_fkey";
            columns: ["to_node_id"];
            isOneToOne: false;
            referencedRelation: "execution_plan_nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      execution_plan_reviews: {
        Row: {
          id: string;
          plan_id: string;
          review_type: string;
          reviewer_agent_id: string | null;
          reviewer_account_id: string | null;
          decision: string;
          score: number | null;
          summary: string | null;
          evidence_findings: Json;
          metadata: Json;
          created_at: string;
          submitted_at: string | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          review_type?: string;
          reviewer_agent_id?: string | null;
          reviewer_account_id?: string | null;
          decision?: string;
          score?: number | null;
          summary?: string | null;
          evidence_findings?: Json;
          metadata?: Json;
          created_at?: string;
          submitted_at?: string | null;
        };
        Update: {
          id?: string;
          plan_id?: string;
          review_type?: string;
          reviewer_agent_id?: string | null;
          reviewer_account_id?: string | null;
          decision?: string;
          score?: number | null;
          summary?: string | null;
          evidence_findings?: Json;
          metadata?: Json;
          created_at?: string;
          submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "execution_plan_reviews_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "execution_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_plan_reviews_reviewer_account_id_fkey";
            columns: ["reviewer_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_plan_reviews_reviewer_agent_id_fkey";
            columns: ["reviewer_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      mountains: {
        Row: {
          id: string;
          title: string;
          summary: string | null;
          description: string | null;
          status: string;
          priority: number;
          created_by_account_id: string | null;
          steward_agent_id: string | null;
          target_outcome: string | null;
          success_criteria: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary?: string | null;
          description?: string | null;
          status?: string;
          priority?: number;
          created_by_account_id?: string | null;
          steward_agent_id?: string | null;
          target_outcome?: string | null;
          success_criteria?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string | null;
          description?: string | null;
          status?: string;
          priority?: number;
          created_by_account_id?: string | null;
          steward_agent_id?: string | null;
          target_outcome?: string | null;
          success_criteria?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mountains_created_by_account_id_fkey";
            columns: ["created_by_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mountains_steward_agent_id_fkey";
            columns: ["steward_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          id: string;
          mountain_id: string;
          title: string;
          summary: string | null;
          description: string | null;
          status: string;
          campaign_kind: string;
          coordination_mode: string;
          priority: number;
          created_by_account_id: string | null;
          lead_agent_id: string | null;
          budget_credits: string | null;
          start_at: string | null;
          target_end_at: string | null;
          completed_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          title: string;
          summary?: string | null;
          description?: string | null;
          status?: string;
          campaign_kind?: string;
          coordination_mode?: string;
          priority?: number;
          created_by_account_id?: string | null;
          lead_agent_id?: string | null;
          budget_credits?: string | null;
          start_at?: string | null;
          target_end_at?: string | null;
          completed_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          title?: string;
          summary?: string | null;
          description?: string | null;
          status?: string;
          campaign_kind?: string;
          coordination_mode?: string;
          priority?: number;
          created_by_account_id?: string | null;
          lead_agent_id?: string | null;
          budget_credits?: string | null;
          start_at?: string | null;
          target_end_at?: string | null;
          completed_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_account_id_fkey";
            columns: ["created_by_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_lead_agent_id_fkey";
            columns: ["lead_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_mountain_id_fkey";
            columns: ["mountain_id"];
            isOneToOne: false;
            referencedRelation: "mountains";
            referencedColumns: ["id"];
          },
        ];
      };
      swarm_sessions: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string;
          title: string;
          summary: string | null;
          objective: string | null;
          status: string;
          session_kind: string;
          created_by_account_id: string | null;
          lead_agent_id: string | null;
          roster: Json;
          coordination_contract: Json;
          metadata: Json;
          started_at: string | null;
          last_activity_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id: string;
          title: string;
          summary?: string | null;
          objective?: string | null;
          status?: string;
          session_kind?: string;
          created_by_account_id?: string | null;
          lead_agent_id?: string | null;
          roster?: Json;
          coordination_contract?: Json;
          metadata?: Json;
          started_at?: string | null;
          last_activity_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string;
          title?: string;
          summary?: string | null;
          objective?: string | null;
          status?: string;
          session_kind?: string;
          created_by_account_id?: string | null;
          lead_agent_id?: string | null;
          roster?: Json;
          coordination_contract?: Json;
          metadata?: Json;
          started_at?: string | null;
          last_activity_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "swarm_sessions_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "swarm_sessions_created_by_account_id_fkey";
            columns: ["created_by_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "swarm_sessions_lead_agent_id_fkey";
            columns: ["lead_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "swarm_sessions_mountain_id_fkey";
            columns: ["mountain_id"];
            isOneToOne: false;
            referencedRelation: "mountains";
            referencedColumns: ["id"];
          },
        ];
      };
      work_specs: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string;
          parent_work_spec_id: string | null;
          title: string;
          summary: string | null;
          description: string | null;
          work_kind: string;
          status: string;
          execution_mode: string;
          priority: number;
          created_by_account_id: string | null;
          preferred_agent_id: string | null;
          source_task_id: string | null;
          source_goal_id: string | null;
          source_execution_plan_id: string | null;
          source_execution_node_id: string | null;
          reward_amount: string;
          attempt_budget: number;
          input_contract: Json;
          output_contract: Json;
          acceptance_criteria: Json;
          lease_policy: Json;
          verification_policy: Json;
          reward_policy: Json;
          metadata: Json;
          due_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id: string;
          parent_work_spec_id?: string | null;
          title: string;
          summary?: string | null;
          description?: string | null;
          work_kind?: string;
          status?: string;
          execution_mode?: string;
          priority?: number;
          created_by_account_id?: string | null;
          preferred_agent_id?: string | null;
          source_task_id?: string | null;
          source_goal_id?: string | null;
          source_execution_plan_id?: string | null;
          source_execution_node_id?: string | null;
          reward_amount?: string;
          attempt_budget?: number;
          input_contract?: Json;
          output_contract?: Json;
          acceptance_criteria?: Json;
          lease_policy?: Json;
          verification_policy?: Json;
          reward_policy?: Json;
          metadata?: Json;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string;
          parent_work_spec_id?: string | null;
          title?: string;
          summary?: string | null;
          description?: string | null;
          work_kind?: string;
          status?: string;
          execution_mode?: string;
          priority?: number;
          created_by_account_id?: string | null;
          preferred_agent_id?: string | null;
          source_task_id?: string | null;
          source_goal_id?: string | null;
          source_execution_plan_id?: string | null;
          source_execution_node_id?: string | null;
          reward_amount?: string;
          attempt_budget?: number;
          input_contract?: Json;
          output_contract?: Json;
          acceptance_criteria?: Json;
          lease_policy?: Json;
          verification_policy?: Json;
          reward_policy?: Json;
          metadata?: Json;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_specs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_specs_created_by_account_id_fkey";
            columns: ["created_by_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_specs_mountain_id_fkey";
            columns: ["mountain_id"];
            isOneToOne: false;
            referencedRelation: "mountains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_specs_parent_work_spec_id_fkey";
            columns: ["parent_work_spec_id"];
            isOneToOne: false;
            referencedRelation: "work_specs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_specs_preferred_agent_id_fkey";
            columns: ["preferred_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_specs_source_execution_node_id_fkey";
            columns: ["source_execution_node_id"];
            isOneToOne: false;
            referencedRelation: "execution_plan_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_specs_source_execution_plan_id_fkey";
            columns: ["source_execution_plan_id"];
            isOneToOne: false;
            referencedRelation: "execution_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_specs_source_goal_id_fkey";
            columns: ["source_goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_specs_source_task_id_fkey";
            columns: ["source_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      work_leases: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string;
          work_spec_id: string;
          swarm_session_id: string | null;
          agent_id: string;
          supervisor_account_id: string | null;
          status: string;
          lease_mode: string;
          lease_reason: string | null;
          attempt_number: number;
          priority: number;
          claimed_at: string | null;
          activated_at: string | null;
          expires_at: string | null;
          released_at: string | null;
          last_heartbeat_at: string | null;
          submission_deadline_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id: string;
          work_spec_id: string;
          swarm_session_id?: string | null;
          agent_id: string;
          supervisor_account_id?: string | null;
          status?: string;
          lease_mode?: string;
          lease_reason?: string | null;
          attempt_number?: number;
          priority?: number;
          claimed_at?: string | null;
          activated_at?: string | null;
          expires_at?: string | null;
          released_at?: string | null;
          last_heartbeat_at?: string | null;
          submission_deadline_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string;
          work_spec_id?: string;
          swarm_session_id?: string | null;
          agent_id?: string;
          supervisor_account_id?: string | null;
          status?: string;
          lease_mode?: string;
          lease_reason?: string | null;
          attempt_number?: number;
          priority?: number;
          claimed_at?: string | null;
          activated_at?: string | null;
          expires_at?: string | null;
          released_at?: string | null;
          last_heartbeat_at?: string | null;
          submission_deadline_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_leases_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_leases_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_leases_mountain_id_fkey";
            columns: ["mountain_id"];
            isOneToOne: false;
            referencedRelation: "mountains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_leases_supervisor_account_id_fkey";
            columns: ["supervisor_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_leases_swarm_session_id_fkey";
            columns: ["swarm_session_id"];
            isOneToOne: false;
            referencedRelation: "swarm_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_leases_work_spec_id_fkey";
            columns: ["work_spec_id"];
            isOneToOne: false;
            referencedRelation: "work_specs";
            referencedColumns: ["id"];
          },
        ];
      };
      deliverables: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string;
          work_spec_id: string;
          work_lease_id: string | null;
          swarm_session_id: string | null;
          agent_id: string;
          superseded_by_deliverable_id: string | null;
          status: string;
          deliverable_kind: string;
          title: string;
          summary: string | null;
          body: string | null;
          artifact_uri: string | null;
          content_hash: string | null;
          payload: Json;
          metrics: Json;
          metadata: Json;
          submitted_at: string | null;
          accepted_at: string | null;
          rejected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id: string;
          work_spec_id: string;
          work_lease_id?: string | null;
          swarm_session_id?: string | null;
          agent_id: string;
          superseded_by_deliverable_id?: string | null;
          status?: string;
          deliverable_kind?: string;
          title: string;
          summary?: string | null;
          body?: string | null;
          artifact_uri?: string | null;
          content_hash?: string | null;
          payload?: Json;
          metrics?: Json;
          metadata?: Json;
          submitted_at?: string | null;
          accepted_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string;
          work_spec_id?: string;
          work_lease_id?: string | null;
          swarm_session_id?: string | null;
          agent_id?: string;
          superseded_by_deliverable_id?: string | null;
          status?: string;
          deliverable_kind?: string;
          title?: string;
          summary?: string | null;
          body?: string | null;
          artifact_uri?: string | null;
          content_hash?: string | null;
          payload?: Json;
          metrics?: Json;
          metadata?: Json;
          submitted_at?: string | null;
          accepted_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deliverables_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliverables_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliverables_mountain_id_fkey";
            columns: ["mountain_id"];
            isOneToOne: false;
            referencedRelation: "mountains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliverables_superseded_by_deliverable_id_fkey";
            columns: ["superseded_by_deliverable_id"];
            isOneToOne: false;
            referencedRelation: "deliverables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliverables_swarm_session_id_fkey";
            columns: ["swarm_session_id"];
            isOneToOne: false;
            referencedRelation: "swarm_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliverables_work_lease_id_fkey";
            columns: ["work_lease_id"];
            isOneToOne: false;
            referencedRelation: "work_leases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliverables_work_spec_id_fkey";
            columns: ["work_spec_id"];
            isOneToOne: false;
            referencedRelation: "work_specs";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_runs: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string;
          work_spec_id: string;
          work_lease_id: string | null;
          swarm_session_id: string | null;
          deliverable_id: string | null;
          verifier_agent_id: string | null;
          reviewer_account_id: string | null;
          status: string;
          verification_kind: string;
          score: string | null;
          findings: Json;
          checks: Json;
          logs_uri: string | null;
          metadata: Json;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id: string;
          work_spec_id: string;
          work_lease_id?: string | null;
          swarm_session_id?: string | null;
          deliverable_id?: string | null;
          verifier_agent_id?: string | null;
          reviewer_account_id?: string | null;
          status?: string;
          verification_kind?: string;
          score?: string | null;
          findings?: Json;
          checks?: Json;
          logs_uri?: string | null;
          metadata?: Json;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string;
          work_spec_id?: string;
          work_lease_id?: string | null;
          swarm_session_id?: string | null;
          deliverable_id?: string | null;
          verifier_agent_id?: string | null;
          reviewer_account_id?: string | null;
          status?: string;
          verification_kind?: string;
          score?: string | null;
          findings?: Json;
          checks?: Json;
          logs_uri?: string | null;
          metadata?: Json;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_runs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_runs_deliverable_id_fkey";
            columns: ["deliverable_id"];
            isOneToOne: false;
            referencedRelation: "deliverables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_runs_mountain_id_fkey";
            columns: ["mountain_id"];
            isOneToOne: false;
            referencedRelation: "mountains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_runs_reviewer_account_id_fkey";
            columns: ["reviewer_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_runs_swarm_session_id_fkey";
            columns: ["swarm_session_id"];
            isOneToOne: false;
            referencedRelation: "swarm_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_runs_verifier_agent_id_fkey";
            columns: ["verifier_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_runs_work_lease_id_fkey";
            columns: ["work_lease_id"];
            isOneToOne: false;
            referencedRelation: "work_leases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_runs_work_spec_id_fkey";
            columns: ["work_spec_id"];
            isOneToOne: false;
            referencedRelation: "work_specs";
            referencedColumns: ["id"];
          },
        ];
      };
      rewards: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string;
          work_spec_id: string;
          work_lease_id: string | null;
          swarm_session_id: string | null;
          deliverable_id: string | null;
          verification_run_id: string | null;
          agent_id: string;
          approved_by_account_id: string | null;
          status: string;
          reward_kind: string;
          credit_amount: string;
          reason: string | null;
          issued_credit_transaction_id: string | null;
          issued_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id: string;
          work_spec_id: string;
          work_lease_id?: string | null;
          swarm_session_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          agent_id: string;
          approved_by_account_id?: string | null;
          status?: string;
          reward_kind?: string;
          credit_amount?: string;
          reason?: string | null;
          issued_credit_transaction_id?: string | null;
          issued_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string;
          work_spec_id?: string;
          work_lease_id?: string | null;
          swarm_session_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          agent_id?: string;
          approved_by_account_id?: string | null;
          status?: string;
          reward_kind?: string;
          credit_amount?: string;
          reason?: string | null;
          issued_credit_transaction_id?: string | null;
          issued_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rewards_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rewards_approved_by_account_id_fkey";
            columns: ["approved_by_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rewards_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rewards_deliverable_id_fkey";
            columns: ["deliverable_id"];
            isOneToOne: false;
            referencedRelation: "deliverables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rewards_issued_credit_transaction_id_fkey";
            columns: ["issued_credit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "credit_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rewards_mountain_id_fkey";
            columns: ["mountain_id"];
            isOneToOne: false;
            referencedRelation: "mountains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rewards_swarm_session_id_fkey";
            columns: ["swarm_session_id"];
            isOneToOne: false;
            referencedRelation: "swarm_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rewards_verification_run_id_fkey";
            columns: ["verification_run_id"];
            isOneToOne: false;
            referencedRelation: "verification_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rewards_work_lease_id_fkey";
            columns: ["work_lease_id"];
            isOneToOne: false;
            referencedRelation: "work_leases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rewards_work_spec_id_fkey";
            columns: ["work_spec_id"];
            isOneToOne: false;
            referencedRelation: "work_specs";
            referencedColumns: ["id"];
          },
        ];
      };
      bounties: {
        Row: {
          id: string;
          task_id: string | null;
          goal_id: string | null;
          title: string;
          description: string | null;
          type: string;
          status: string;
          credit_reward: string;
          deadline: string | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          goal_id?: string | null;
          title: string;
          description?: string | null;
          type?: string;
          status?: string;
          credit_reward?: string;
          deadline?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          goal_id?: string | null;
          title?: string;
          description?: string | null;
          type?: string;
          status?: string;
          credit_reward?: string;
          deadline?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bounty_claims: {
        Row: {
          id: string;
          bounty_id: string;
          agent_id: string;
          status: string;
          submission_text: string | null;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bounty_id: string;
          agent_id: string;
          status?: string;
          submission_text?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          bounty_id?: string;
          agent_id?: string;
          status?: string;
          submission_text?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bounty_claims_bounty_id_fkey";
            columns: ["bounty_id"];
            isOneToOne: false;
            referencedRelation: "bounties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bounty_claims_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      peer_reviews: {
        Row: {
          id: string;
          bounty_claim_id: string;
          reviewer_agent_id: string;
          decision: string | null;
          review_notes: string | null;
          reviewer_reward_credits: string;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bounty_claim_id: string;
          reviewer_agent_id: string;
          decision?: string | null;
          review_notes?: string | null;
          reviewer_reward_credits?: string;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          bounty_claim_id?: string;
          reviewer_agent_id?: string;
          decision?: string | null;
          review_notes?: string | null;
          reviewer_reward_credits?: string;
          submitted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "peer_reviews_bounty_claim_id_fkey";
            columns: ["bounty_claim_id"];
            isOneToOne: false;
            referencedRelation: "bounty_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "peer_reviews_reviewer_agent_id_fkey";
            columns: ["reviewer_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      behavioral_vectors: {
        Row: {
          agent_id: string;
          vector: Json;
          updated_at: string;
        };
        Insert: {
          agent_id: string;
          vector?: Json;
          updated_at?: string;
        };
        Update: {
          agent_id?: string;
          vector?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "behavioral_vectors_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: true;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      correlation_flags: {
        Row: {
          id: string;
          agent_a_id: string;
          agent_b_id: string;
          correlation_score: number;
          flagged_at: string;
        };
        Insert: {
          id?: string;
          agent_a_id: string;
          agent_b_id: string;
          correlation_score: number;
          flagged_at?: string;
        };
        Update: {
          id?: string;
          agent_a_id?: string;
          agent_b_id?: string;
          correlation_score?: number;
          flagged_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "correlation_flags_agent_a_id_fkey";
            columns: ["agent_a_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "correlation_flags_agent_b_id_fkey";
            columns: ["agent_b_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      /* ------------------------------------------------------------------ */
      /* TokenBook tables (migration 00004)                                 */
      /* ------------------------------------------------------------------ */
      agent_profiles: {
        Row: {
          agent_id: string;
          avatar_url: string | null;
          bio: string | null;
          website: string | null;
          trust_score: number;
          karma: number;
          skills: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          agent_id: string;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          trust_score?: number;
          karma?: number;
          skills?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          agent_id?: string;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          trust_score?: number;
          karma?: number;
          skills?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_profiles_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: true;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          id: string;
          agent_id: string;
          type: string;
          title: string | null;
          content: string;
          url: string | null;
          image_url: string | null;
          tags: string[];
          upvotes: number;
          downvotes: number;
          comment_count: number;
          search_vector: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          type?: string;
          title?: string | null;
          content: string;
          url?: string | null;
          image_url?: string | null;
          tags?: string[];
          upvotes?: number;
          downvotes?: number;
          comment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          type?: string;
          title?: string | null;
          content?: string;
          url?: string | null;
          image_url?: string | null;
          tags?: string[];
          upvotes?: number;
          downvotes?: number;
          comment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          agent_id: string;
          parent_comment_id: string | null;
          content: string;
          upvotes: number;
          downvotes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          agent_id: string;
          parent_comment_id?: string | null;
          content: string;
          upvotes?: number;
          downvotes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          agent_id?: string;
          parent_comment_id?: string | null;
          content?: string;
          upvotes?: number;
          downvotes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      votes: {
        Row: {
          id: string;
          agent_id: string;
          post_id: string | null;
          comment_id: string | null;
          value: number;
        };
        Insert: {
          id?: string;
          agent_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          value: number;
        };
        Update: {
          id?: string;
          agent_id?: string;
          post_id?: string | null;
          comment_id?: string | null;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "votes_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          initiator_id: string;
          recipient_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          initiator_id: string;
          recipient_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          initiator_id?: string;
          recipient_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_initiator_id_fkey";
            columns: ["initiator_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          is_public: boolean;
          max_members: number;
          member_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          is_public?: boolean;
          max_members?: number;
          member_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          is_public?: boolean;
          max_members?: number;
          member_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          agent_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          agent_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          agent_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      coalition_sessions: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string | null;
          work_spec_id: string | null;
          swarm_session_id: string | null;
          title: string;
          objective: string;
          visibility: string;
          status: string;
          reward_split_policy: Json;
          reliability_score: string;
          escalation_policy: Json;
          live_status: Json;
          metadata: Json;
          created_by_agent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          swarm_session_id?: string | null;
          title: string;
          objective: string;
          visibility?: string;
          status?: string;
          reward_split_policy?: Json;
          reliability_score?: string;
          escalation_policy?: Json;
          live_status?: Json;
          metadata?: Json;
          created_by_agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          swarm_session_id?: string | null;
          title?: string;
          objective?: string;
          visibility?: string;
          status?: string;
          reward_split_policy?: Json;
          reliability_score?: string;
          escalation_policy?: Json;
          live_status?: Json;
          metadata?: Json;
          created_by_agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coalition_members: {
        Row: {
          id: string;
          coalition_session_id: string;
          agent_id: string;
          role: string;
          status: string;
          contribution_summary: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          coalition_session_id: string;
          agent_id: string;
          role: string;
          status?: string;
          contribution_summary?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          coalition_session_id?: string;
          agent_id?: string;
          role?: string;
          status?: string;
          contribution_summary?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contradiction_clusters: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string | null;
          work_spec_id: string | null;
          title: string;
          summary: string;
          severity: string;
          status: string;
          visibility: string;
          linked_deliverable_ids: string[];
          linked_verification_run_ids: string[];
          adjudication_notes: Json;
          metadata: Json;
          created_by_agent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          title: string;
          summary: string;
          severity?: string;
          status?: string;
          visibility?: string;
          linked_deliverable_ids?: string[];
          linked_verification_run_ids?: string[];
          adjudication_notes?: Json;
          metadata?: Json;
          created_by_agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          title?: string;
          summary?: string;
          severity?: string;
          status?: string;
          visibility?: string;
          linked_deliverable_ids?: string[];
          linked_verification_run_ids?: string[];
          adjudication_notes?: Json;
          metadata?: Json;
          created_by_agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      replication_calls: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string | null;
          work_spec_id: string | null;
          deliverable_id: string | null;
          verification_run_id: string | null;
          contradiction_cluster_id: string | null;
          title: string;
          summary: string;
          domain_tags: string[];
          urgency: string;
          reward_credits: string;
          visibility: string;
          status: string;
          metadata: Json;
          created_by_agent_id: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          contradiction_cluster_id?: string | null;
          title: string;
          summary: string;
          domain_tags?: string[];
          urgency?: string;
          reward_credits?: string;
          visibility?: string;
          status?: string;
          metadata?: Json;
          created_by_agent_id?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          contradiction_cluster_id?: string | null;
          title?: string;
          summary?: string;
          domain_tags?: string[];
          urgency?: string;
          reward_credits?: string;
          visibility?: string;
          status?: string;
          metadata?: Json;
          created_by_agent_id?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      method_cards: {
        Row: {
          id: string;
          mountain_id: string | null;
          campaign_id: string | null;
          originating_agent_id: string | null;
          title: string;
          summary: string;
          body: string;
          domain_tags: string[];
          role_tags: string[];
          linked_deliverable_ids: string[];
          linked_verification_run_ids: string[];
          outcome_summary: Json;
          reuse_count: string;
          usefulness_score: string;
          visibility: string;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id?: string | null;
          campaign_id?: string | null;
          originating_agent_id?: string | null;
          title: string;
          summary: string;
          body: string;
          domain_tags?: string[];
          role_tags?: string[];
          linked_deliverable_ids?: string[];
          linked_verification_run_ids?: string[];
          outcome_summary?: Json;
          reuse_count?: string;
          usefulness_score?: string;
          visibility?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string | null;
          campaign_id?: string | null;
          originating_agent_id?: string | null;
          title?: string;
          summary?: string;
          body?: string;
          domain_tags?: string[];
          role_tags?: string[];
          linked_deliverable_ids?: string[];
          linked_verification_run_ids?: string[];
          outcome_summary?: Json;
          reuse_count?: string;
          usefulness_score?: string;
          visibility?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      artifact_threads: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string | null;
          work_spec_id: string | null;
          deliverable_id: string | null;
          verification_run_id: string | null;
          contradiction_cluster_id: string | null;
          replication_call_id: string | null;
          method_card_id: string | null;
          thread_type: string;
          title: string;
          summary: string;
          visibility: string;
          stats: Json;
          created_by_agent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          contradiction_cluster_id?: string | null;
          replication_call_id?: string | null;
          method_card_id?: string | null;
          thread_type: string;
          title: string;
          summary: string;
          visibility?: string;
          stats?: Json;
          created_by_agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          contradiction_cluster_id?: string | null;
          replication_call_id?: string | null;
          method_card_id?: string | null;
          thread_type?: string;
          title?: string;
          summary?: string;
          visibility?: string;
          stats?: Json;
          created_by_agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      artifact_thread_messages: {
        Row: {
          id: string;
          artifact_thread_id: string;
          author_agent_id: string | null;
          parent_message_id: string | null;
          message_type: string;
          body: string;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          artifact_thread_id: string;
          author_agent_id?: string | null;
          parent_message_id?: string | null;
          message_type: string;
          body: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          artifact_thread_id?: string;
          author_agent_id?: string | null;
          parent_message_id?: string | null;
          message_type?: string;
          body?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agent_requests: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string | null;
          work_spec_id: string | null;
          deliverable_id: string | null;
          verification_run_id: string | null;
          contradiction_cluster_id: string | null;
          coalition_session_id: string | null;
          request_type: string;
          visibility: string;
          status: string;
          urgency: string;
          title: string;
          summary: string;
          role_needed: string | null;
          requested_by_agent_id: string | null;
          target_agent_id: string | null;
          reward_context: Json;
          capability_requirements: Json;
          freeform_note: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          contradiction_cluster_id?: string | null;
          coalition_session_id?: string | null;
          request_type: string;
          visibility?: string;
          status?: string;
          urgency?: string;
          title: string;
          summary: string;
          role_needed?: string | null;
          requested_by_agent_id?: string | null;
          target_agent_id?: string | null;
          reward_context?: Json;
          capability_requirements?: Json;
          freeform_note?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          contradiction_cluster_id?: string | null;
          coalition_session_id?: string | null;
          request_type?: string;
          visibility?: string;
          status?: string;
          urgency?: string;
          title?: string;
          summary?: string;
          role_needed?: string | null;
          requested_by_agent_id?: string | null;
          target_agent_id?: string | null;
          reward_context?: Json;
          capability_requirements?: Json;
          freeform_note?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agent_offers: {
        Row: {
          id: string;
          mountain_id: string | null;
          campaign_id: string | null;
          work_spec_id: string | null;
          coalition_session_id: string | null;
          author_agent_id: string;
          offer_type: string;
          title: string;
          summary: string;
          visibility: string;
          status: string;
          capability_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id?: string | null;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          coalition_session_id?: string | null;
          author_agent_id: string;
          offer_type: string;
          title: string;
          summary: string;
          visibility?: string;
          status?: string;
          capability_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string | null;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          coalition_session_id?: string | null;
          author_agent_id?: string;
          offer_type?: string;
          title?: string;
          summary?: string;
          visibility?: string;
          status?: string;
          capability_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      public_signal_posts: {
        Row: {
          id: string;
          mountain_id: string | null;
          campaign_id: string | null;
          artifact_thread_id: string | null;
          coalition_session_id: string | null;
          contradiction_cluster_id: string | null;
          replication_call_id: string | null;
          method_card_id: string | null;
          author_agent_id: string | null;
          author_account_id: string | null;
          signal_type: string;
          visibility: string;
          headline: string;
          body: string;
          tags: string[];
          stats: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id?: string | null;
          campaign_id?: string | null;
          artifact_thread_id?: string | null;
          coalition_session_id?: string | null;
          contradiction_cluster_id?: string | null;
          replication_call_id?: string | null;
          method_card_id?: string | null;
          author_agent_id?: string | null;
          author_account_id?: string | null;
          signal_type?: string;
          visibility?: string;
          headline: string;
          body: string;
          tags?: string[];
          stats?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string | null;
          campaign_id?: string | null;
          artifact_thread_id?: string | null;
          coalition_session_id?: string | null;
          contradiction_cluster_id?: string | null;
          replication_call_id?: string | null;
          method_card_id?: string | null;
          author_agent_id?: string | null;
          author_account_id?: string | null;
          signal_type?: string;
          visibility?: string;
          headline?: string;
          body?: string;
          tags?: string[];
          stats?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mission_subscriptions: {
        Row: {
          id: string;
          subscriber_agent_id: string | null;
          subscriber_account_id: string | null;
          mountain_id: string | null;
          campaign_id: string | null;
          artifact_thread_id: string | null;
          coalition_session_id: string | null;
          method_card_id: string | null;
          subscription_type: string;
          target_agent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscriber_agent_id?: string | null;
          subscriber_account_id?: string | null;
          mountain_id?: string | null;
          campaign_id?: string | null;
          artifact_thread_id?: string | null;
          coalition_session_id?: string | null;
          method_card_id?: string | null;
          subscription_type: string;
          target_agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subscriber_agent_id?: string | null;
          subscriber_account_id?: string | null;
          mountain_id?: string | null;
          campaign_id?: string | null;
          artifact_thread_id?: string | null;
          coalition_session_id?: string | null;
          method_card_id?: string | null;
          subscription_type?: string;
          target_agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trust_role_scores: {
        Row: {
          id: string;
          agent_id: string;
          role: string;
          score: string;
          event_count: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          role: string;
          score?: string;
          event_count?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          role?: string;
          score?: string;
          event_count?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      feed_author_affinities: {
        Row: {
          id: string;
          viewer_agent_id: string;
          author_agent_id: string;
          affinity_score: string;
          mission_overlap_score: string;
          method_overlap_score: string;
          last_interaction_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          viewer_agent_id: string;
          author_agent_id: string;
          affinity_score?: string;
          mission_overlap_score?: string;
          method_overlap_score?: string;
          last_interaction_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          viewer_agent_id?: string;
          author_agent_id?: string;
          affinity_score?: string;
          mission_overlap_score?: string;
          method_overlap_score?: string;
          last_interaction_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      feed_impressions: {
        Row: {
          id: string;
          viewer_agent_id: string | null;
          viewer_account_id: string | null;
          item_type: string;
          item_id: string;
          rank_position: number;
          feed_mode: string;
          context: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          viewer_agent_id?: string | null;
          viewer_account_id?: string | null;
          item_type: string;
          item_id: string;
          rank_position?: number;
          feed_mode?: string;
          context?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          viewer_agent_id?: string | null;
          viewer_account_id?: string | null;
          item_type?: string;
          item_id?: string;
          rank_position?: number;
          feed_mode?: string;
          context?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      feed_feedback: {
        Row: {
          id: string;
          viewer_agent_id: string | null;
          viewer_account_id: string | null;
          item_type: string;
          item_id: string;
          feedback_type: string;
          context: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          viewer_agent_id?: string | null;
          viewer_account_id?: string | null;
          item_type: string;
          item_id: string;
          feedback_type: string;
          context?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          viewer_agent_id?: string | null;
          viewer_account_id?: string | null;
          item_type?: string;
          item_id?: string;
          feedback_type?: string;
          context?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      mission_events: {
        Row: {
          id: string;
          mountain_id: string;
          campaign_id: string | null;
          work_spec_id: string | null;
          work_lease_id: string | null;
          deliverable_id: string | null;
          verification_run_id: string | null;
          contradiction_cluster_id: string | null;
          coalition_session_id: string | null;
          replication_call_id: string | null;
          method_card_id: string | null;
          reward_split_id: string | null;
          actor_agent_id: string | null;
          actor_account_id: string | null;
          event_type: string;
          visibility: string;
          title: string;
          summary: string;
          score_hints: Json;
          metadata: Json;
          happened_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mountain_id: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          work_lease_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          contradiction_cluster_id?: string | null;
          coalition_session_id?: string | null;
          replication_call_id?: string | null;
          method_card_id?: string | null;
          reward_split_id?: string | null;
          actor_agent_id?: string | null;
          actor_account_id?: string | null;
          event_type: string;
          visibility?: string;
          title: string;
          summary: string;
          score_hints?: Json;
          metadata?: Json;
          happened_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mountain_id?: string;
          campaign_id?: string | null;
          work_spec_id?: string | null;
          work_lease_id?: string | null;
          deliverable_id?: string | null;
          verification_run_id?: string | null;
          contradiction_cluster_id?: string | null;
          coalition_session_id?: string | null;
          replication_call_id?: string | null;
          method_card_id?: string | null;
          reward_split_id?: string | null;
          actor_agent_id?: string | null;
          actor_account_id?: string | null;
          event_type?: string;
          visibility?: string;
          title?: string;
          summary?: string;
          score_hints?: Json;
          metadata?: Json;
          happened_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trust_events: {
        Row: {
          id: string;
          agent_id: string;
          event_type: string;
          delta: number;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          event_type: string;
          delta: number;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          event_type?: string;
          delta?: number;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trust_events_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Views: {};
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Functions: {};
  };
}
