export type MissionVisibility = "private" | "scoped" | "public";
export type MountainStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type CampaignStatus = "planned" | "active" | "paused" | "completed" | "cancelled";
export type WorkSpecStatus =
  | "queued"
  | "ready"
  | "blocked"
  | "in_progress"
  | "submitted"
  | "verified"
  | "failed"
  | "cancelled";
export type LeaseStatus =
  | "offered"
  | "accepted"
  | "active"
  | "checkpoint_due"
  | "submitted"
  | "verified"
  | "failed"
  | "expired"
  | "reassigned";
export type DeliverableType =
  | "claim"
  | "note"
  | "artifact"
  | "proof"
  | "notebook"
  | "report"
  | "experiment"
  | "synthesis";
export type VerificationOutcome =
  | "pending"
  | "passed"
  | "failed"
  | "needs_replication"
  | "contradiction";
export type ReplanReason =
  | "blocked"
  | "duplicate"
  | "low_confidence"
  | "contradiction"
  | "promising_signal"
  | "budget_shift"
  | "manual_intervention";
export type RewardRole =
  | "proposer"
  | "executor"
  | "reviewer"
  | "synthesizer"
  | "verifier"
  | "coalition"
  | "supervisor_bonus";
export type SettlementPolicyMode =
  | "fixed"
  | "dynamic_difficulty"
  | "auction"
  | "coalition_formula"
  | "replication_bonus"
  | "contradiction_resolution";

export interface MountainBudgetEnvelopes {
  decomposition: number;
  execution: number;
  replication: number;
  synthesis: number;
  emergency: number;
}

export interface MountainRecord {
  id: string;
  slug: string | null;
  title: string;
  thesis: string;
  target_problem: string;
  success_criteria: string;
  domain: string;
  horizon: string;
  visibility: MissionVisibility;
  status: MountainStatus;
  created_by_account_id: string;
  total_budget_credits: number;
  budget_envelopes: MountainBudgetEnvelopes;
  governance_policy: Record<string, unknown>;
  decomposition_policy: Record<string, unknown>;
  settlement_policy_mode: SettlementPolicyMode;
  settlement_policy: Record<string, unknown>;
  tags: string[];
  metadata: Record<string, unknown>;
  launched_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecord {
  id: string;
  mountain_id: string;
  title: string;
  summary: string;
  hypothesis: string | null;
  status: CampaignStatus;
  risk_ceiling: string;
  decomposition_aggressiveness: number;
  replication_policy: Record<string, unknown>;
  governance_policy: Record<string, unknown>;
  budget_credits: number;
  milestone_order: number;
  owner_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkSpecRecord {
  id: string;
  mountain_id: string;
  campaign_id: string | null;
  parent_work_spec_id: string | null;
  title: string;
  summary: string;
  status: WorkSpecStatus;
  contribution_type: string;
  role_type: string;
  allowed_role_types: string[];
  input_contract: Record<string, unknown>;
  output_contract: Record<string, unknown>;
  verification_contract: Record<string, unknown>;
  dependency_edges: Array<Record<string, unknown>>;
  reward_envelope: Record<string, unknown>;
  checkpoint_cadence_minutes: number;
  duplication_policy: Record<string, unknown>;
  risk_class: string;
  priority: number;
  speculative: boolean;
  synthesis_required: boolean;
  owner_account_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkLeaseRecord {
  id: string;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string;
  assigned_agent_id: string | null;
  assigned_by_account_id: string | null;
  status: LeaseStatus;
  offered_at: string;
  accepted_at: string | null;
  started_at: string | null;
  expires_at: string | null;
  checkpoint_due_at: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  renewal_count: number;
  failure_reason: string | null;
  rationale: string | null;
  checkpoint_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SwarmSessionRecord {
  id: string;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string | null;
  title: string;
  objective: string;
  status: string;
  coalition_terms: Record<string, unknown>;
  credit_split_policy: Record<string, unknown>;
  coordination_context: Record<string, unknown>;
  created_by_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliverableRecord {
  id: string;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string | null;
  work_lease_id: string | null;
  agent_id: string | null;
  deliverable_type: DeliverableType;
  title: string;
  summary: string;
  evidence_bundle: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  references_bundle: Array<Record<string, unknown>>;
  upstream_refs: string[];
  confidence: number;
  novelty_score: number;
  reproducibility_score: number;
  artifact_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface VerificationRunRecord {
  id: string;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string | null;
  deliverable_id: string | null;
  verifier_agent_id: string | null;
  requested_by_agent_id: string | null;
  verification_type: string;
  outcome: VerificationOutcome;
  confidence_delta: number;
  contradiction_count: number;
  findings: Array<Record<string, unknown>>;
  evidence_bundle: Array<Record<string, unknown>>;
  requested_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReplanRecord {
  id: string;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string | null;
  work_lease_id: string | null;
  issued_by_account_id: string | null;
  reason: ReplanReason;
  action: string;
  summary: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RewardSplitRecord {
  id: string;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string | null;
  work_lease_id: string | null;
  deliverable_id: string | null;
  beneficiary_agent_id: string | null;
  beneficiary_account_id: string | null;
  role: RewardRole;
  amount_credits: number;
  rationale: string;
  settlement_status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type RewardRecord = RewardSplitRecord;

export interface CapabilityProfileRecord {
  agent_id: string;
  domain_tags: string[];
  tool_access_classes: string[];
  compute_profile: Record<string, unknown>;
  preferred_roles: string[];
  collaboration_style: string | null;
  replication_reliability: number;
  synthesis_quality: number;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface ReputationScoreRecord {
  agent_id: string;
  mission_reliability: number;
  scientific_rigor: number;
  collaboration_quality: number;
  review_quality: number;
  social_contribution: number;
  deployment_health: number;
  updated_at: string;
}

export interface MountainSummary extends MountainRecord {
  campaign_count: number;
  work_spec_count: number;
  active_lease_count: number;
  verified_deliverable_count: number;
  reward_distributed_credits: number;
  progress_percent: number;
}

export interface RuntimeAssignment {
  lease_id: string;
  work_spec_id: string;
  mountain_id: string;
  campaign_id: string | null;
  title: string;
  summary: string;
  role_type: string;
  status: LeaseStatus;
  checkpoint_due_at: string | null;
  expires_at: string | null;
  reward_envelope: Record<string, unknown>;
  rationale: string | null;
}

export interface AgentRuntimeView {
  current_assignments: RuntimeAssignment[];
  checkpoint_deadlines: RuntimeAssignment[];
  blocked_items: RuntimeAssignment[];
  coalition_invites: SwarmSessionRecord[];
  verification_requests: VerificationRunRecord[];
  recommended_speculative_lines: WorkSpecRecord[];
  mission_context: {
    mountains: MountainSummary[];
    campaigns: CampaignRecord[];
    capability_profile: CapabilityProfileRecord | null;
    reputation: ReputationScoreRecord | null;
  };
  supervisor_messages: Array<{
    id: string;
    tone: "directive" | "warning" | "opportunity";
    subject: string;
    detail: string;
  }>;
}

export interface SupervisorOverview {
  mountains: MountainSummary[];
  campaigns: CampaignRecord[];
  work_specs: WorkSpecRecord[];
  work_leases: WorkLeaseRecord[];
  deliverables: DeliverableRecord[];
  verification_runs: VerificationRunRecord[];
  replans: ReplanRecord[];
  reward_splits: RewardSplitRecord[];
  swarm_sessions: SwarmSessionRecord[];
  system_metrics: {
    active_mountains: number;
    blocked_specs: number;
    overdue_checkpoints: number;
    contradiction_alerts: number;
    unsettled_rewards: number;
  };
}

export interface SupervisorSummary {
  overview: {
    active_mountains: number;
    active_campaigns: number;
    queued_work_specs: number;
    active_work_leases: number;
    forming_swarms: number;
    pending_verifications: number;
    unsettled_rewards: number;
  };
  queues: {
    mountains: MountainSummary[];
    campaigns: CampaignRecord[];
    work_specs: WorkSpecRecord[];
    work_leases: WorkLeaseRecord[];
    swarm_sessions: SwarmSessionRecord[];
    deliverables: DeliverableRecord[];
    verification_runs: VerificationRunRecord[];
    rewards: RewardRecord[];
  };
  interventions: ReplanRecord[];
}

export interface SupervisorCampaignSummary {
  campaign: CampaignRecord;
  mountain: MountainSummary | null;
  work_specs: WorkSpecRecord[];
  work_leases: WorkLeaseRecord[];
  swarm_sessions: SwarmSessionRecord[];
  deliverables: DeliverableRecord[];
  verification_runs: VerificationRunRecord[];
  rewards: RewardRecord[];
  metrics: {
    queued_specs: number;
    active_leases: number;
    pending_verifications: number;
    unsettled_rewards: number;
  };
}
