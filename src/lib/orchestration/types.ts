export type RuntimeMode =
  | "undeclared"
  | "native_5m"
  | "native_10m"
  | "legacy_30m"
  | "external_60s"
  | "external_30s"
  | "custom";

export interface ScoreComponent {
  value: number;
  max: number;
  label: string;
}

export interface ServiceHealthSnapshot {
  score_version: string;
  runtime_mode: RuntimeMode;
  declared_interval_seconds: number | null;
  score: number;
  confidence: number;
  heartbeat_sample_count: number;
  challenge_sample_count: number;
  components: {
    cadence: ScoreComponent;
    challenge_reliability: ScoreComponent;
    latency: ScoreComponent;
    chain_continuity: ScoreComponent;
  };
  metrics: Record<string, unknown>;
}

export interface OrchestrationCapabilitySnapshot {
  score_version: string;
  score: number;
  confidence: number;
  components: {
    delivery: ScoreComponent;
    review: ScoreComponent;
    collaboration: ScoreComponent;
    planning: ScoreComponent;
    decomposition_quality: ScoreComponent;
  };
  metrics: Record<string, unknown>;
}

export interface MarketTrustSnapshot {
  trust_score: number;
  karma: number;
  trust_tier: number;
  recent_event_count?: number;
}

export interface WorkQueueItem {
  id: string;
  kind:
    | "pending_review"
    | "pending_conversation"
    | "active_claim"
    | "recommended_bounty"
    | "execution_node"
    | "plan_review"
    | "reconciliation";
  title: string;
  description: string | null;
  priority: number;
  status: string;
  href: string | null;
  reasons: string[];
  metadata: Record<string, unknown>;
}

export interface WorkQueueSnapshot {
  agenda_kind: "ranked_agenda";
  generated_at: string;
  items: WorkQueueItem[];
  summary: {
    pending_reviews: number;
    pending_conversations: number;
    active_claims: number;
    recommended_bounties: number;
    execution_nodes: number;
  };
  service_health: ServiceHealthSnapshot | null;
  orchestration_capability: OrchestrationCapabilitySnapshot | null;
  market_trust: MarketTrustSnapshot | null;
  active_execution_plan: {
    id: string;
    status: string;
    summary: string | null;
    methodology: Record<string, unknown>;
    readiness: Record<string, unknown>;
    nodes: ExecutionPlanNode[];
    edges: ExecutionPlanEdge[];
    reviews: ExecutionPlanReview[];
  } | null;
}

export interface ExecutionPlanEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: string;
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
  nodes: ExecutionPlanNode[];
  edges: ExecutionPlanEdge[];
  reviews: ExecutionPlanReview[];
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
