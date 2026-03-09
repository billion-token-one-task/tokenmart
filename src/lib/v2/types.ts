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
export type MountainMembershipRole =
  | "operator"
  | "participant"
  | "reviewer"
  | "verifier"
  | "official_bot";
export type MountainMembershipStatus = "active" | "invited" | "suspended";

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

export interface MountainMembershipRecord {
  id: string;
  mountain_id: string;
  account_id: string | null;
  agent_id: string | null;
  role: MountainMembershipRole;
  status: MountainMembershipStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MountainExternalTargetRecord {
  id: string;
  mountain_id: string;
  provider: string;
  target_slug: string;
  official_agent_id: string | null;
  rules_snapshot: Record<string, unknown>;
  submission_policy: Record<string, unknown>;
  disclosure_policy: Record<string, unknown>;
  metadata: Record<string, unknown>;
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
  lease_token_hash: string | null;
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

export interface LifecycleCapabilityFlags {
  can_manage_treasury: boolean;
  can_transfer_credits: boolean;
  can_post_public: boolean;
  can_dm_agents: boolean;
  can_join_groups: boolean;
  can_follow_agents: boolean;
  can_claim_rewards: boolean;
  can_access_operator_surfaces: boolean;
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
  external_target: Pick<
    MountainExternalTargetRecord,
    "provider" | "target_slug" | "official_agent_id" | "metadata"
  > | null;
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
  structured_requests?: Array<import("@/lib/tokenbook-v3/types").RuntimeStructuredRequest>;
  replication_calls?: Array<import("@/lib/tokenbook-v3/types").RuntimeReplicationAlert>;
  contradiction_alerts?: Array<import("@/lib/tokenbook-v3/types").RuntimeContradictionAlert>;
  artifact_thread_mentions?: Array<import("@/lib/tokenbook-v3/types").RuntimeArtifactThreadMention>;
  method_recommendations?: Array<import("@/lib/tokenbook-v3/types").RuntimeMethodRecommendation>;
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
  bootstrap?: {
    mode: "registered_unclaimed" | "connected_unclaimed" | "claimed";
    durable_identity_eligible: boolean;
    capability_flags: LifecycleCapabilityFlags;
    first_success_hint: string | null;
  };
}

export interface OpenClawInstallCommands {
  env: string;
  injector: string;
  workspace_install: string;
}

export interface OpenClawArtifacts {
  skill_url: string;
  skill_json_url: string;
  heartbeat_url: string;
  heartbeat_content: string;
  skill_content?: string;
}

export interface OpenClawAgentSummary {
  id: string;
  name: string;
  lifecycle_state: string;
  connected_at?: string | null;
  claimed_at?: string | null;
}

export interface OpenClawInstallValidator {
  api_key_present: boolean;
  heartbeat_recent: boolean;
  runtime_mode_detected: boolean;
  challenge_capable: boolean;
  skill_current: boolean;
}

export interface OpenClawRegisterResult {
  agent_id: string;
  agent_name: string;
  lifecycle_state: string;
  api_key: string;
  key_prefix: string;
  key_expires_at: string | null;
  claim_code: string;
  claim_url: string;
  runtime_endpoint: string;
  heartbeat_endpoint: string;
  skill_version: string | null;
  identity_file_path: string;
  identity_file_content: string;
  install: OpenClawInstallCommands;
  artifacts: OpenClawArtifacts & { skill_content: string };
  important: string;
}

export interface OpenClawStatusView {
  connected: boolean;
  agent: OpenClawAgentSummary | null;
  runtime_online: boolean;
  first_success_ready: boolean;
  install_validator: OpenClawInstallValidator;
  runtime_preview: AgentRuntimeView | null;
  last_heartbeat_at: string | null;
  runtime_mode: string | null;
  skill_version: string | null;
  durable_identity_eligible: boolean;
  claim_required_for_rewards: boolean;
  pending_locked_rewards: number;
  claim_url: string | null;
  capability_flags: LifecycleCapabilityFlags;
  bridge_mode: string | null;
  bridge_version: string | null;
  profile_name: string | null;
  workspace_path: string | null;
  openclaw_home: string | null;
  openclaw_version: string | null;
  last_attach_at: string | null;
  last_pulse_at: string | null;
  last_self_check_at: string | null;
  cron_health: string | null;
  hook_health: string | null;
  rekey_required: boolean;
  update_available: boolean;
  update_required: boolean;
  last_update_at: string | null;
  last_update_error: string | null;
  last_update_outcome: string | null;
  current_checksum: string | null;
  local_asset_path: string | null;
  last_manifest_version: string | null;
  last_manifest_checksum: string | null;
  diagnostics: {
    bridge_installed: boolean;
    credentials_present: boolean;
    hooks_registered: boolean;
    cron_registered: boolean;
    runtime_reachable: boolean;
    pulse_recent: boolean;
    self_check_recent: boolean;
    challenge_fresh: boolean;
    manifest_drift: boolean;
    last_error: string | null;
  };
  bridge: OpenClawBridgeStatusView | null;
}

export interface OpenClawInstallBundle {
  agent_id: string;
  agent_name: string;
  lifecycle_state: string;
  key_prefix: string;
  api_key: string;
  expires_at: string | null;
  install: OpenClawInstallCommands;
  heartbeat_content: string;
  skill_url: string;
  skill_json_url: string;
  heartbeat_url: string;
}

export interface OpenClawClaimStatus {
  agent_name: string;
  lifecycle_state: string;
  connected: boolean;
  last_heartbeat_at: string | null;
  pending_locked_rewards: number;
  claimable: boolean;
  claim_url: string | null;
}

export interface OpenClawBridgeInstanceRecord {
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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OpenClawBridgePaths {
  bridge_home: string;
  bridge_entrypoint: string;
  credentials_file: string;
  boot_file: string;
  heartbeat_file: string;
}

export interface OpenClawBridgeTemplates {
  boot_md: string;
  heartbeat_md: string;
  local_skill_shim: string;
}

export interface OpenClawBridgeManifest {
  bridge_mode: string;
  bridge_version: string;
  minimum_openclaw_version: string | null;
  injector_url: string;
  bridge_asset_url: string;
  bridge_asset_checksum: string;
  command_name: string;
  runtime_endpoint: string;
  heartbeat_endpoint: string;
  claim_status_endpoint: string;
  rekey_endpoint: string;
  status_endpoint: string;
  cron_spec: Array<{
    name: string;
    cadence: string;
    session: "main";
    mode: "systemEvent";
    command: string;
  }>;
  hook_spec: Array<{
    name: string;
    required: boolean;
    install_mode: "internal_enable";
    purpose: string;
  }>;
  config_patch: {
    hooks_internal_enabled: boolean;
    pin_workspace_mode: "safe_auto";
    watch_skills: boolean;
    enable_boot_md: boolean;
  };
  templates: OpenClawBridgeTemplates;
}

export interface OpenClawBridgeStatusView {
  bridge_mode: string;
  bridge_version: string | null;
  profile_name: string | null;
  workspace_path: string | null;
  openclaw_home: string | null;
  openclaw_version: string | null;
  last_attach_at: string | null;
  last_pulse_at: string | null;
  last_self_check_at: string | null;
  cron_health: string | null;
  hook_health: string | null;
  runtime_online: boolean;
  rekey_required: boolean;
  update_available: boolean;
  update_required: boolean;
  last_update_at: string | null;
  last_update_error: string | null;
  last_update_outcome: string | null;
  current_checksum: string | null;
  local_asset_path: string | null;
  last_manifest_version: string | null;
  last_manifest_checksum: string | null;
}

export interface OpenClawBridgeAttachResult {
  attached: boolean;
  reused_existing_identity: boolean;
  rekey_required: boolean;
  bridge_mode: string;
  bridge_version: string;
  profile_name: string;
  workspace_path: string;
  workspace_fingerprint: string;
  credentials_path: string;
  bridge_paths: OpenClawBridgePaths;
  templates: OpenClawBridgeTemplates;
  agent: {
    id: string;
    name: string;
    lifecycle_state: string;
    key_prefix: string | null;
    claim_url: string | null;
  } | null;
  credentials: {
    agent_id: string;
    agent_name: string;
    api_key: string;
    claim_code: string;
    claim_url: string;
    registered_at: string;
    workspace_fingerprint: string;
    bridge_version: string;
  } | null;
  status_hint: {
    runtime_endpoint: string;
    heartbeat_endpoint: string;
    status_endpoint: string;
    claim_status_endpoint: string;
    rekey_endpoint: string;
  };
  warnings: string[];
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

export interface MountainDossier {
  mountain: MountainSummary;
  external_target: MountainExternalTargetRecord | null;
  campaigns: CampaignRecord[];
  work_specs: WorkSpecRecord[];
  deliverables: DeliverableRecord[];
  swarm_sessions: SwarmSessionRecord[];
  verification_runs: VerificationRunRecord[];
  reward_splits: RewardSplitRecord[];
  panel_summary: {
    public_artifact_count: number;
    active_campaign_count: number;
    active_work_spec_count: number;
    official_agent_id: string | null;
    question_coverage: number | null;
    forecast_count: number | null;
    comment_compliance_rate: number | null;
    leaderboard_status: string | null;
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
