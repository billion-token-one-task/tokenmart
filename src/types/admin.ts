export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type GoalStatus = "pending" | "in_progress" | "completed" | "failed" | "open" | "skipped";
export type BountyStatus =
  | "open"
  | "claimed"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "in_progress"
  | "under_review"
  | "expired";
export type BountyType = "work" | "verification";
export type BountyClaimStatus =
  | "claimed"
  | "submitted"
  | "approved"
  | "rejected";
export type ReviewDecision = "approve" | "reject";
export type MountainStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type CampaignStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived";
export type SwarmSessionStatus =
  | "forming"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived";
export type WorkSpecStatus =
  | "draft"
  | "ready"
  | "leased"
  | "in_progress"
  | "submitted"
  | "verifying"
  | "completed"
  | "rejected"
  | "cancelled"
  | "archived";
export type WorkLeaseStatus =
  | "offered"
  | "active"
  | "submitted"
  | "under_verification"
  | "completed"
  | "released"
  | "expired"
  | "revoked"
  | "failed";
export type DeliverableStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "rejected"
  | "superseded"
  | "withdrawn";
export type VerificationRunStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "errored"
  | "cancelled"
  | "needs_review";
export type RewardStatus = "pending" | "approved" | "issued" | "reversed" | "cancelled";
export type WorkLeaseMode = "exclusive" | "shared" | "shadow";

export interface Task {
  id: string;
  title: string;
  description: string;
  created_by: string;
  status: TaskStatus;
  priority: number;
  passing_spec: string | null;
  credit_reward: number | null;
  assigned_to?: string | null;
  deadline?: string | null;
  methodology_version: string;
  metadata?: Record<string, unknown>;
  input_spec: unknown[];
  output_spec: unknown[];
  retry_policy: Record<string, unknown>;
  verification_method: string | null;
  verification_target: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  task_id: string;
  parent_goal_id: string | null;
  path: string;
  depth: number;
  title: string;
  description: string | null;
  passing_spec: string | null;
  status: GoalStatus;
  credit_reward: number | null;
  assigned_agent_id: string | null;
  requires_all_subgoals: boolean;
  evidence: unknown[];
  input_spec: unknown[];
  output_spec: unknown[];
  retry_policy: Record<string, unknown>;
  verification_method: string | null;
  verification_target: string | null;
  orchestration_role: string;
  node_type: string;
  blocked_reason: string | null;
  completion_confidence: number | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GoalDependency {
  id: string;
  goal_id: string;
  depends_on_goal_id: string;
  dependency_kind: string;
  created_at: string;
}

export interface ExecutionPlan {
  id: string;
  task_id: string;
  created_by: string | null;
  agent_id: string | null;
  status: string;
  methodology_version: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExecutionPlanNode {
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
  budget_credits: number | null;
  budget_minutes: number | null;
  actual_minutes: number | null;
  passing_spec: string | null;
  evidence: unknown[];
  input_spec: unknown[];
  output_spec: unknown[];
  retry_policy: Record<string, unknown>;
  verification_method: string | null;
  verification_target: string | null;
  rework_count: number;
  handoff_count: number;
  successful_handoff_count: number;
  duplicate_overlap_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExecutionPlanReview {
  id: string;
  plan_id: string;
  review_type: string;
  reviewer_agent_id: string | null;
  reviewer_account_id: string | null;
  decision: string;
  score: number | null;
  summary: string | null;
  evidence_findings: unknown[];
  created_at: string;
  submitted_at: string | null;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  type: BountyType;
  task_id: string | null;
  goal_id: string | null;
  created_by: string;
  credit_reward: number;
  status: BountyStatus;
  deadline: string | null;
  max_claimants?: number;
  metadata?: Record<string, unknown>;
  task_title?: string | null;
  goal_title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BountyClaim {
  id: string;
  bounty_id: string;
  agent_id: string;
  status: BountyClaimStatus;
  submission_data?: Record<string, unknown> | null;
  submitted_at: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  credits_awarded?: number | null;
  created_at: string;
}

export interface PeerReview {
  id: string;
  bounty_claim_id: string;
  reviewer_agent_id: string;
  decision: ReviewDecision | null;
  review_notes: string | null;
  submitted_at: string | null;
  reviewer_reward_credits: number | null;
  created_at: string;
}

export interface Mountain {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  status: MountainStatus;
  priority: number;
  created_by_account_id: string | null;
  steward_agent_id: string | null;
  slug?: string | null;
  thesis?: string | null;
  target_problem?: string | null;
  target_outcome: string | null;
  success_criteria: unknown[] | string;
  visibility?: "private" | "scoped" | "public";
  domain?: string | null;
  horizon?: string | null;
  total_budget_credits?: number | null;
  budget_envelopes?: Record<string, unknown>;
  governance_policy?: Record<string, unknown>;
  decomposition_policy?: Record<string, unknown>;
  settlement_policy_mode?:
    | "fixed"
    | "dynamic_difficulty"
    | "auction"
    | "coalition_formula"
    | "replication_bonus"
    | "contradiction_resolution";
  settlement_policy?: Record<string, unknown>;
  tags?: string[];
  metadata: Record<string, unknown>;
  launched_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  mountain_id: string;
  title: string;
  summary: string | null;
  description: string | null;
  status: CampaignStatus;
  campaign_kind: string;
  coordination_mode: string;
  priority: number;
  created_by_account_id: string | null;
  lead_agent_id: string | null;
  hypothesis?: string | null;
  risk_ceiling?: string | null;
  decomposition_aggressiveness?: number | null;
  replication_policy?: Record<string, unknown>;
  governance_policy?: Record<string, unknown>;
  milestone_order?: number | null;
  owner_account_id?: string | null;
  budget_credits: number | null;
  start_at: string | null;
  target_end_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SwarmSession {
  id: string;
  mountain_id: string;
  campaign_id: string;
  work_spec_id?: string | null;
  title: string;
  summary: string | null;
  objective: string | null;
  status: SwarmSessionStatus;
  session_kind: string;
  created_by_account_id: string | null;
  lead_agent_id: string | null;
  roster: unknown[];
  coordination_contract: Record<string, unknown>;
  coalition_terms?: Record<string, unknown>;
  credit_split_policy?: Record<string, unknown>;
  coordination_context?: Record<string, unknown>;
  created_by_agent_id?: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  last_activity_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkSpec {
  id: string;
  mountain_id: string;
  campaign_id: string;
  parent_work_spec_id: string | null;
  title: string;
  summary: string | null;
  description: string | null;
  work_kind: string;
  status: WorkSpecStatus;
  execution_mode: string;
  priority: number;
  created_by_account_id: string | null;
  preferred_agent_id: string | null;
  contribution_type?: string | null;
  role_type?: string | null;
  allowed_role_types?: string[];
  source_task_id: string | null;
  source_goal_id: string | null;
  source_execution_plan_id: string | null;
  source_execution_node_id: string | null;
  reward_amount: number;
  attempt_budget: number;
  input_contract: unknown[];
  output_contract: unknown[];
  acceptance_criteria: unknown[];
  lease_policy: Record<string, unknown>;
  verification_policy: Record<string, unknown>;
  reward_policy: Record<string, unknown>;
  dependency_edges?: unknown[];
  reward_envelope?: Record<string, unknown>;
  checkpoint_cadence_minutes?: number | null;
  duplication_policy?: Record<string, unknown>;
  risk_class?: string | null;
  speculative?: boolean;
  synthesis_required?: boolean;
  owner_account_id?: string | null;
  metadata: Record<string, unknown>;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkLease {
  id: string;
  mountain_id: string;
  campaign_id: string;
  work_spec_id: string;
  swarm_session_id: string | null;
  agent_id: string;
  supervisor_account_id: string | null;
  assigned_agent_id?: string | null;
  assigned_by_account_id?: string | null;
  status: WorkLeaseStatus;
  lease_mode: WorkLeaseMode;
  lease_reason: string | null;
  rationale?: string | null;
  attempt_number: number;
  priority: number;
  claimed_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  released_at: string | null;
  checkpoint_due_at?: string | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  renewal_count?: number;
  failure_reason?: string | null;
  last_heartbeat_at: string | null;
  submission_deadline_at: string | null;
  checkpoint_payload?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Deliverable {
  id: string;
  mountain_id: string;
  campaign_id: string;
  work_spec_id: string;
  work_lease_id: string | null;
  swarm_session_id: string | null;
  agent_id: string;
  superseded_by_deliverable_id: string | null;
  status: DeliverableStatus;
  deliverable_kind: string;
  deliverable_type?: string;
  title: string;
  summary: string | null;
  body: string | null;
  artifact_uri: string | null;
  artifact_url?: string | null;
  content_hash: string | null;
  payload: Record<string, unknown>;
  evidence_bundle?: unknown[];
  claims?: unknown[];
  references_bundle?: unknown[];
  upstream_refs?: string[];
  confidence?: number | null;
  novelty_score?: number | null;
  reproducibility_score?: number | null;
  metrics: Record<string, unknown>;
  metadata: Record<string, unknown>;
  submitted_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationRun {
  id: string;
  mountain_id: string;
  campaign_id: string;
  work_spec_id: string;
  work_lease_id: string | null;
  swarm_session_id: string | null;
  deliverable_id: string | null;
  verifier_agent_id: string | null;
  reviewer_account_id: string | null;
  status: VerificationRunStatus;
  verification_kind: string;
  verification_type?: string;
  outcome?: "pending" | "passed" | "failed" | "needs_replication" | "contradiction";
  score: number | null;
  confidence_delta?: number | null;
  contradiction_count?: number | null;
  findings: unknown[];
  checks: unknown[];
  evidence_bundle?: unknown[];
  requested_by_agent_id?: string | null;
  requested_at?: string | null;
  logs_uri: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reward {
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
  status: RewardStatus;
  reward_kind: string;
  credit_amount: number;
  reason: string | null;
  issued_credit_transaction_id: string | null;
  issued_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Replan {
  id: string;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string | null;
  work_lease_id: string | null;
  issued_by_account_id: string | null;
  reason:
    | "blocked"
    | "duplicate"
    | "low_confidence"
    | "contradiction"
    | "promising_signal"
    | "budget_shift"
    | "manual_intervention";
  action: string;
  summary: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RewardSplit {
  id: string;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string | null;
  work_lease_id: string | null;
  deliverable_id: string | null;
  beneficiary_agent_id: string | null;
  beneficiary_account_id: string | null;
  role:
    | "proposer"
    | "executor"
    | "reviewer"
    | "synthesizer"
    | "verifier"
    | "coalition"
    | "supervisor_bonus";
  amount_credits: number;
  rationale: string;
  settlement_status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CapabilityProfile {
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

export interface ReputationScore {
  agent_id: string;
  mission_reliability: number;
  scientific_rigor: number;
  collaboration_quality: number;
  review_quality: number;
  social_contribution: number;
  deployment_health: number;
  updated_at: string;
}

export interface AgentRuntimeRewardSummary {
  pending_credit_amount: number;
  approved_credit_amount: number;
  issued_credit_amount: number;
  recent_rewards: Reward[];
}

export interface AgentRuntimeSnapshot {
  agent_id: string;
  active_mountains: Mountain[];
  active_campaigns: Campaign[];
  active_swarm_sessions: SwarmSession[];
  active_work_specs: WorkSpec[];
  active_work_leases: WorkLease[];
  recent_deliverables: Deliverable[];
  pending_verification_runs: VerificationRun[];
  reward_summary: AgentRuntimeRewardSummary;
}

export interface SupervisorOverview {
  mountains_total: number;
  mountains_active: number;
  campaigns_total: number;
  campaigns_active: number;
  swarm_sessions_active: number;
  work_specs_ready: number;
  work_specs_in_progress: number;
  work_leases_active: number;
  work_leases_expiring_soon: number;
  deliverables_submitted: number;
  verification_runs_pending: number;
  rewards_pending: number;
  rewards_issued_credit_amount: number;
}

export interface SupervisorStatusBreakdown {
  mountains: Record<string, number>;
  campaigns: Record<string, number>;
  swarm_sessions: Record<string, number>;
  work_specs: Record<string, number>;
  work_leases: Record<string, number>;
  deliverables: Record<string, number>;
  verification_runs: Record<string, number>;
  rewards: Record<string, number>;
}

export interface SupervisorCampaignRollup {
  campaign: Campaign;
  counts: {
    swarm_sessions_active: number;
    work_specs_ready: number;
    work_specs_in_progress: number;
    work_leases_active: number;
    deliverables_submitted: number;
    verification_runs_pending: number;
    rewards_pending: number;
  };
}

export interface SupervisorHotspotItem {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  campaign_id: string | null;
  mountain_id: string | null;
  agent_id: string | null;
  detail: string | null;
}

export interface SupervisorSummary {
  overview: SupervisorOverview;
  statuses: SupervisorStatusBreakdown;
  campaigns: SupervisorCampaignRollup[];
  hotspots: {
    stale_work_leases: SupervisorHotspotItem[];
    verification_backlog: SupervisorHotspotItem[];
    reward_backlog: SupervisorHotspotItem[];
  };
}

export interface SupervisorCampaignSummary {
  campaign: Campaign;
  mountain: Mountain | null;
  counts: {
    swarm_sessions_active: number;
    work_specs_total: number;
    work_specs_ready: number;
    work_specs_in_progress: number;
    work_leases_active: number;
    deliverables_submitted: number;
    verification_runs_pending: number;
    rewards_pending: number;
    rewards_issued_credit_amount: number;
  };
  swarm_sessions: SwarmSession[];
  work_specs: WorkSpec[];
  work_leases: WorkLease[];
  deliverables: Deliverable[];
  verification_runs: VerificationRun[];
  rewards: Reward[];
}
