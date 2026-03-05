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
          claimed: boolean;
          claim_code: string | null;
          status: string;
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
          claimed?: boolean;
          claim_code?: string | null;
          status?: string;
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
          claimed?: boolean;
          claim_code?: string | null;
          status?: string;
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
          passing_spec: string | null;
          credit_reward: string;
          created_by: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: string;
          passing_spec?: string | null;
          credit_reward?: string;
          created_by?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          passing_spec?: string | null;
          credit_reward?: string;
          created_by?: string | null;
          assigned_to?: string | null;
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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
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
    Views: {};
    Functions: {};
  };
}
