import { createAdminClient } from "@/lib/supabase/admin";
import { grantCredits } from "@/lib/admin/credits";
import {
  computeProposalScore,
  deriveMissionEligibility,
  getNextTrancheAction,
} from "@/lib/missions/logic";
import type {
  Coalition,
  DelegationContract,
  Mission,
  MissionInboxItem,
  MissionLane,
  MissionTreasury,
  MissionTrustSnapshot,
  ProblemStatement,
  Proposal,
  RunArtifact,
  RunReview,
  RunReviewType,
  RunStep,
  SupervisorRun,
  TrancheKind,
  TrancheStatus,
  WorkPackage,
} from "@/types/missions";

type AdminClient = ReturnType<typeof createAdminClient>;

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => String(entry)).filter((entry) => entry.length > 0)
    : [];
}

function asMission(row: Record<string, unknown>): Mission {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    charter: String(row.charter),
    scientific_objective: String(row.scientific_objective),
    success_metric: String(row.success_metric),
    public_rationale: row.public_rationale ? String(row.public_rationale) : null,
    created_by_account_id: String(row.created_by_account_id),
    supervisor_agent_id: row.supervisor_agent_id ? String(row.supervisor_agent_id) : null,
    status: row.status as Mission["status"],
    output_visibility: row.output_visibility as Mission["output_visibility"],
    allowed_tool_classes: safeArray(row.allowed_tool_classes),
    review_policy: safeObject(row.review_policy),
    termination_conditions: safeObject(row.termination_conditions),
    metadata: safeObject(row.metadata),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function asMissionTreasury(row: Record<string, unknown>): MissionTreasury {
  return {
    mission_id: String(row.mission_id),
    total_budget: toNumber(row.total_budget),
    reserved_credits: toNumber(row.reserved_credits),
    spent_credits: toNumber(row.spent_credits),
    clawed_back_credits: toNumber(row.clawed_back_credits),
    bonus_credits: toNumber(row.bonus_credits),
    emergency_freeze: Boolean(row.emergency_freeze),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function asMissionLane(row: Record<string, unknown>): MissionLane {
  return {
    id: String(row.id),
    mission_id: String(row.mission_id),
    lane_key: String(row.lane_key),
    title: String(row.title),
    summary: row.summary ? String(row.summary) : null,
    budget_ceiling: toNumber(row.budget_ceiling),
    per_agent_ceiling: toNumber(row.per_agent_ceiling),
    burst_ceiling: toNumber(row.burst_ceiling),
    status: row.status as MissionLane["status"],
    sort_order: Number(row.sort_order ?? 0),
    metadata: safeObject(row.metadata),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function asProblemStatement(row: Record<string, unknown>): ProblemStatement {
  return {
    id: String(row.id),
    mission_id: String(row.mission_id),
    lane_id: String(row.lane_id),
    title: String(row.title),
    statement: String(row.statement),
    desired_outcome: row.desired_outcome ? String(row.desired_outcome) : null,
    status: row.status as ProblemStatement["status"],
    priority: Number(row.priority ?? 50),
    metadata: safeObject(row.metadata),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function asWorkPackage(row: Record<string, unknown>): WorkPackage {
  return {
    id: String(row.id),
    mission_id: String(row.mission_id),
    lane_id: String(row.lane_id),
    problem_id: String(row.problem_id),
    title: String(row.title),
    brief: String(row.brief),
    status: row.status as WorkPackage["status"],
    tranche_kind: row.tranche_kind as WorkPackage["tranche_kind"],
    posted_reward: toNumber(row.posted_reward),
    budget_cap: toNumber(row.budget_cap),
    deliverable_spec: safeObject(row.deliverable_spec),
    evaluation_spec: safeObject(row.evaluation_spec),
    dependencies: safeArray(row.dependencies),
    review_required: Boolean(row.review_required),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function asCoalition(row: Record<string, unknown>): Coalition {
  return {
    id: String(row.id),
    mission_id: String(row.mission_id),
    name: String(row.name),
    summary: row.summary ? String(row.summary) : null,
    lead_agent_id: row.lead_agent_id ? String(row.lead_agent_id) : null,
    created_at: String(row.created_at),
  };
}

function asProposal(row: Record<string, unknown>): Proposal {
  return {
    id: String(row.id),
    mission_id: String(row.mission_id),
    lane_id: String(row.lane_id),
    problem_id: String(row.problem_id),
    work_package_id: String(row.work_package_id),
    proposer_agent_id: String(row.proposer_agent_id),
    coalition_id: row.coalition_id ? String(row.coalition_id) : null,
    status: row.status as Proposal["status"],
    plan_summary: String(row.plan_summary),
    requested_tranche_kind: row.requested_tranche_kind as Proposal["requested_tranche_kind"],
    requested_credits: toNumber(row.requested_credits),
    confidence: toNumber(row.confidence),
    timeline_summary: row.timeline_summary ? String(row.timeline_summary) : null,
    dependency_summary: row.dependency_summary ? String(row.dependency_summary) : null,
    evidence_of_fit: row.evidence_of_fit ? String(row.evidence_of_fit) : null,
    review_needs: row.review_needs ? String(row.review_needs) : null,
    expected_artifacts: safeArray(row.expected_artifacts),
    score: row.score === null || row.score === undefined ? null : toNumber(row.score),
    score_reasons: safeArray(row.score_reasons),
    decision_notes: row.decision_notes ? String(row.decision_notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function asSupervisorRun(row: Record<string, unknown>): SupervisorRun {
  return {
    id: String(row.id),
    mission_id: String(row.mission_id),
    lane_id: String(row.lane_id),
    problem_id: String(row.problem_id),
    work_package_id: String(row.work_package_id),
    proposal_id: row.proposal_id ? String(row.proposal_id) : null,
    supervisor_account_id: String(row.supervisor_account_id),
    supervisor_agent_id: row.supervisor_agent_id ? String(row.supervisor_agent_id) : null,
    status: row.status as SupervisorRun["status"],
    budget_cap: toNumber(row.budget_cap),
    tranche_released: toNumber(row.tranche_released),
    acceptance_contract: safeObject(row.acceptance_contract),
    escalation_policy: safeObject(row.escalation_policy),
    metadata: safeObject(row.metadata),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function asDelegationContract(row: Record<string, unknown>): DelegationContract {
  return {
    id: String(row.id),
    run_step_id: String(row.run_step_id),
    objective: String(row.objective),
    allowed_tools: safeArray(row.allowed_tools),
    forbidden_actions: safeArray(row.forbidden_actions),
    required_outputs: safeArray(row.required_outputs),
    evaluation_method: row.evaluation_method ? String(row.evaluation_method) : null,
    review_path: safeArray(row.review_path),
    escalation_target: safeObject(row.escalation_target),
    deadline_at: row.deadline_at ? String(row.deadline_at) : null,
    metadata: safeObject(row.metadata),
  };
}

function asRunStep(
  row: Record<string, unknown>,
  contract: DelegationContract | null = null,
): RunStep {
  return {
    id: String(row.id),
    run_id: String(row.run_id),
    parent_step_id: row.parent_step_id ? String(row.parent_step_id) : null,
    title: String(row.title),
    objective: String(row.objective),
    status: row.status as RunStep["status"],
    assigned_agent_id: row.assigned_agent_id ? String(row.assigned_agent_id) : null,
    budget_cap: toNumber(row.budget_cap),
    spent_credits: toNumber(row.spent_credits),
    due_at: row.due_at ? String(row.due_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    delegation_contract: contract,
  };
}

function asRunReview(row: Record<string, unknown>): RunReview {
  return {
    id: String(row.id),
    run_id: String(row.run_id),
    run_step_id: row.run_step_id ? String(row.run_step_id) : null,
    review_type: row.review_type as RunReviewType,
    reviewer_account_id: row.reviewer_account_id ? String(row.reviewer_account_id) : null,
    reviewer_agent_id: row.reviewer_agent_id ? String(row.reviewer_agent_id) : null,
    decision: row.decision as RunReviewDecision,
    summary: row.summary ? String(row.summary) : null,
    evidence_findings: Array.isArray(row.evidence_findings) ? row.evidence_findings : [],
    created_at: String(row.created_at),
    submitted_at: row.submitted_at ? String(row.submitted_at) : null,
  };
}

function asRunArtifact(row: Record<string, unknown>): RunArtifact {
  return {
    id: String(row.id),
    run_id: String(row.run_id),
    run_step_id: row.run_step_id ? String(row.run_step_id) : null,
    artifact_type: String(row.artifact_type),
    title: String(row.title),
    uri: row.uri ? String(row.uri) : null,
    content: safeObject(row.content),
    visibility: row.visibility as RunArtifact["visibility"],
    created_at: String(row.created_at),
  };
}

function nowIso() {
  return new Date().toISOString();
}

async function loadTrustSignals(db: AdminClient, agentId: string): Promise<MissionTrustSnapshot> {
  const typedDb = db as any;
  const [{ data: daemonScore }, { data: profile }] = await Promise.all([
    typedDb
      .from("daemon_scores")
      .select("service_health_score, orchestration_score")
      .eq("agent_id", agentId)
      .maybeSingle(),
    typedDb.from("agent_profiles").select("trust_score").eq("agent_id", agentId).maybeSingle(),
  ]);

  const missionTrustScore = Math.max(
    0,
    Math.min(
      1,
      (toNumber(profile?.trust_score) + toNumber(daemonScore?.orchestration_score)) / 200,
    ),
  );
  const marketTrustScore = Math.max(0, Math.min(1, (toNumber(profile?.trust_score) + 100) / 200));
  const orchestrationScore = Math.max(
    0,
    Math.min(1, toNumber(daemonScore?.orchestration_score) / 100),
  );
  const serviceHealthScore = Math.max(
    0,
    Math.min(1, toNumber(daemonScore?.service_health_score) / 100),
  );
  const eligibility = deriveMissionEligibility({
    laneFrozen: false,
    missionTrustScore,
    orchestrationScore,
    serviceHealthScore,
    requiredMissionTrust: 0.4,
    requiredOrchestration: 0.35,
    requiredServiceHealth: 0.4,
  });

  return {
    mission_trust_score: missionTrustScore,
    market_trust_score: marketTrustScore,
    orchestration_score: orchestrationScore,
    service_health_score: serviceHealthScore,
    eligible: eligibility.eligible,
    reasons: eligibility.reasons,
  };
}

export async function listMissions() {
  const db = createAdminClient() as any;
  const [{ data: missionRows }, { data: treasuryRows }, { data: laneRows }, { data: runRows }] =
    await Promise.all([
      db.from("missions").select("*").order("updated_at", { ascending: false }),
      db.from("mission_treasuries").select("*"),
      db.from("mission_lanes").select("*"),
      db.from("supervisor_runs").select("*"),
    ]);

  const treasuryByMissionId = new Map<string, MissionTreasury>(
    (treasuryRows ?? []).map((row: Record<string, unknown>) => {
      const treasury = asMissionTreasury(row);
      return [treasury.mission_id, treasury];
    }),
  );
  const lanesByMissionId = new Map<string, MissionLane[]>();
  for (const row of laneRows ?? []) {
    const lane = asMissionLane(row);
    lanesByMissionId.set(lane.mission_id, [...(lanesByMissionId.get(lane.mission_id) ?? []), lane]);
  }
  const activeRunCountByMissionId = new Map<string, number>();
  for (const row of runRows ?? []) {
    const missionId = String(row.mission_id);
    activeRunCountByMissionId.set(missionId, (activeRunCountByMissionId.get(missionId) ?? 0) + 1);
  }

  return (missionRows ?? []).map((row: Record<string, unknown>) => {
    const mission = asMission(row);
    return {
      mission,
      treasury: treasuryByMissionId.get(mission.id) ?? null,
      lanes: lanesByMissionId.get(mission.id) ?? [],
      active_runs: activeRunCountByMissionId.get(mission.id) ?? 0,
    };
  });
}

export async function getMissionDetail(missionId: string) {
  const db = createAdminClient() as any;
  const [
    { data: missionRow },
    { data: treasuryRow },
    { data: laneRows },
    { data: problemRows },
    { data: packageRows },
    { data: proposalRows },
    { data: coalitionRows },
    { data: runRows },
    { data: stepRows },
    { data: contractRows },
    { data: reviewRows },
    { data: artifactRows },
  ] = await Promise.all([
    db.from("missions").select("*").eq("id", missionId).maybeSingle(),
    db.from("mission_treasuries").select("*").eq("mission_id", missionId).maybeSingle(),
    db.from("mission_lanes").select("*").eq("mission_id", missionId).order("sort_order", { ascending: true }),
    db.from("mission_problems").select("*").eq("mission_id", missionId).order("priority", { ascending: false }),
    db.from("mission_work_packages").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
    db.from("mission_proposals").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
    db.from("mission_coalitions").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
    db.from("supervisor_runs").select("*").eq("mission_id", missionId).order("updated_at", { ascending: false }),
    db.from("run_steps").select("*").in("run_id", (runRows ?? []).map((row: Record<string, unknown>) => row.id).concat(["00000000-0000-0000-0000-000000000000"])),
    db.from("delegation_contracts").select("*"),
    db.from("run_reviews").select("*").in("run_id", (runRows ?? []).map((row: Record<string, unknown>) => row.id).concat(["00000000-0000-0000-0000-000000000000"])),
    db.from("run_artifacts").select("*").in("run_id", (runRows ?? []).map((row: Record<string, unknown>) => row.id).concat(["00000000-0000-0000-0000-000000000000"])),
  ]);

  if (!missionRow) return null;

  const mission = asMission(missionRow);
  const treasury = treasuryRow ? asMissionTreasury(treasuryRow) : null;
  const lanes = (laneRows ?? []).map(asMissionLane);
  const problems = (problemRows ?? []).map(asProblemStatement);
  const workPackages = (packageRows ?? []).map(asWorkPackage);
  const proposals = (proposalRows ?? []).map(asProposal);
  const coalitions = (coalitionRows ?? []).map(asCoalition);
  const runs = (runRows ?? []).map(asSupervisorRun);
  const contractsByStepId = new Map<string, DelegationContract>(
    (contractRows ?? []).map((row: Record<string, unknown>) => {
      const contract = asDelegationContract(row);
      return [contract.run_step_id, contract];
    }),
  );
  const steps = (stepRows ?? []).map((row: Record<string, unknown>) =>
    asRunStep(row, contractsByStepId.get(String(row.id)) ?? null),
  );
  const reviews = (reviewRows ?? []).map(asRunReview);
  const artifacts = (artifactRows ?? []).map(asRunArtifact);

  return {
    mission,
    treasury,
    lanes,
    problems,
    work_packages: workPackages,
    proposals,
    coalitions,
    runs,
    steps,
    reviews,
    artifacts,
  };
}

export interface CreateMissionInput {
  slug: string;
  title: string;
  charter: string;
  scientificObjective: string;
  successMetric: string;
  publicRationale?: string | null;
  totalBudget: number;
  supervisorAgentId?: string | null;
  outputVisibility?: Mission["output_visibility"];
  allowedToolClasses?: string[];
  reviewPolicy?: Record<string, unknown>;
  terminationConditions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createMission(input: CreateMissionInput, accountId: string) {
  const db = createAdminClient() as any;
  const missionInsert = {
    slug: input.slug,
    title: input.title,
    charter: input.charter,
    scientific_objective: input.scientificObjective,
    success_metric: input.successMetric,
    public_rationale: input.publicRationale ?? null,
    created_by_account_id: accountId,
    supervisor_agent_id: input.supervisorAgentId ?? null,
    status: "active",
    output_visibility: input.outputVisibility ?? "open",
    allowed_tool_classes: input.allowedToolClasses ?? [],
    review_policy: input.reviewPolicy ?? {
      planner: true,
      execution: true,
      reconciler: true,
    },
    termination_conditions: input.terminationConditions ?? {},
    metadata: input.metadata ?? {},
  };

  const { data: missionRow, error: missionError } = await db
    .from("missions")
    .insert(missionInsert)
    .select("*")
    .single();
  if (missionError || !missionRow) {
    throw new Error(`Failed to create mission: ${missionError?.message ?? "unknown"}`);
  }

  const { error: treasuryError } = await db.from("mission_treasuries").insert({
    mission_id: missionRow.id,
    total_budget: input.totalBudget.toFixed(8),
    reserved_credits: "0.00000000",
    spent_credits: "0.00000000",
    clawed_back_credits: "0.00000000",
    bonus_credits: "0.00000000",
    emergency_freeze: false,
  });
  if (treasuryError) {
    throw new Error(`Failed to initialize mission treasury: ${treasuryError.message}`);
  }

  await db.from("mission_tranches").insert({
    mission_id: missionRow.id,
    tranche_kind: "planning",
    status: "planned" as TrancheStatus,
    amount: input.totalBudget.toFixed(8),
    reserved_amount: "0.00000000",
    released_amount: "0.00000000",
    spent_amount: "0.00000000",
    notes: "Mission treasury initialized",
    created_by_account_id: accountId,
  });

  return getMissionDetail(String(missionRow.id));
}

export interface CreateLaneInput {
  missionId: string;
  laneKey: string;
  title: string;
  summary?: string | null;
  budgetCeiling: number;
  perAgentCeiling: number;
  burstCeiling: number;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
  initialProblem?: {
    title: string;
    statement: string;
    desiredOutcome?: string | null;
    priority?: number;
  } | null;
  initialWorkPackage?: {
    title: string;
    brief: string;
    trancheKind: TrancheKind;
    postedReward: number;
    budgetCap: number;
    deliverableSpec?: Record<string, unknown>;
    evaluationSpec?: Record<string, unknown>;
    dependencies?: string[];
    reviewRequired?: boolean;
  } | null;
}

export async function createMissionLane(input: CreateLaneInput) {
  const db = createAdminClient() as any;
  const { data: laneRow, error: laneError } = await db
    .from("mission_lanes")
    .insert({
      mission_id: input.missionId,
      lane_key: input.laneKey,
      title: input.title,
      summary: input.summary ?? null,
      budget_ceiling: input.budgetCeiling.toFixed(8),
      per_agent_ceiling: input.perAgentCeiling.toFixed(8),
      burst_ceiling: input.burstCeiling.toFixed(8),
      status: "open",
      sort_order: input.sortOrder ?? 0,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (laneError || !laneRow) {
    throw new Error(`Failed to create mission lane: ${laneError?.message ?? "unknown"}`);
  }

  let problemId: string | null = null;
  if (input.initialProblem) {
    const { data: problemRow, error: problemError } = await db
      .from("mission_problems")
      .insert({
        mission_id: input.missionId,
        lane_id: laneRow.id,
        title: input.initialProblem.title,
        statement: input.initialProblem.statement,
        desired_outcome: input.initialProblem.desiredOutcome ?? null,
        status: "open",
        priority: input.initialProblem.priority ?? 50,
        metadata: {},
      })
      .select("*")
      .single();
    if (problemError || !problemRow) {
      throw new Error(`Failed to create initial problem: ${problemError?.message ?? "unknown"}`);
    }
    problemId = String(problemRow.id);
  }

  if (input.initialWorkPackage && problemId) {
    const packageInsert = {
      mission_id: input.missionId,
      lane_id: laneRow.id,
      problem_id: problemId,
      title: input.initialWorkPackage.title,
      brief: input.initialWorkPackage.brief,
      status: "open",
      tranche_kind: input.initialWorkPackage.trancheKind,
      posted_reward: input.initialWorkPackage.postedReward.toFixed(8),
      budget_cap: input.initialWorkPackage.budgetCap.toFixed(8),
      deliverable_spec: input.initialWorkPackage.deliverableSpec ?? {},
      evaluation_spec: input.initialWorkPackage.evaluationSpec ?? {},
      dependencies: input.initialWorkPackage.dependencies ?? [],
      review_required: input.initialWorkPackage.reviewRequired ?? true,
    };
    const { error: packageError } = await db.from("mission_work_packages").insert(packageInsert);
    if (packageError) {
      throw new Error(`Failed to create initial work package: ${packageError.message}`);
    }
  }

  return getMissionDetail(input.missionId);
}

export interface CreateProposalInput {
  problemId: string;
  proposerAgentId: string;
  coalitionId?: string | null;
  planSummary: string;
  requestedTrancheKind: TrancheKind;
  requestedCredits: number;
  confidence: number;
  timelineSummary?: string | null;
  dependencySummary?: string | null;
  evidenceOfFit?: string | null;
  reviewNeeds?: string | null;
  expectedArtifacts?: string[];
  fitScore?: number;
  diversityScore?: number;
  expectedValue?: number;
  correlationRisk?: number;
  verificationReadiness?: number;
}

export async function createProposal(input: CreateProposalInput) {
  const db = createAdminClient() as any;
  const { data: problemRow } = await db
    .from("mission_problems")
    .select("*")
    .eq("id", input.problemId)
    .maybeSingle();
  if (!problemRow) throw new Error("Problem not found");

  const { data: workPackageRow } = await db
    .from("mission_work_packages")
    .select("*")
    .eq("problem_id", input.problemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!workPackageRow) throw new Error("No work package is open for this problem");

  const trustSignals = await loadTrustSignals(db, input.proposerAgentId);
  const workPackage = asWorkPackage(workPackageRow);
  const score = computeProposalScore({
    requestedCredits: input.requestedCredits,
    budgetCap: workPackage.budget_cap,
    confidence: input.confidence,
    fitScore: input.fitScore ?? Math.min(1, 0.45 + (input.evidenceOfFit?.length ?? 0) / 500),
    priorVerifiedScore: trustSignals.orchestration_score,
    diversityScore: input.diversityScore ?? 0.55,
    correlationRisk: input.correlationRisk ?? 0.2,
    verificationReadiness: input.verificationReadiness ?? 0.6,
    expectedValue: input.expectedValue ?? 0.7,
  });

  const { data: proposalRow, error: proposalError } = await db
    .from("mission_proposals")
    .insert({
      mission_id: problemRow.mission_id,
      lane_id: problemRow.lane_id,
      problem_id: problemRow.id,
      work_package_id: workPackage.id,
      proposer_agent_id: input.proposerAgentId,
      coalition_id: input.coalitionId ?? null,
      status: "submitted",
      plan_summary: input.planSummary,
      requested_tranche_kind: input.requestedTrancheKind,
      requested_credits: input.requestedCredits.toFixed(8),
      confidence: input.confidence,
      timeline_summary: input.timelineSummary ?? null,
      dependency_summary: input.dependencySummary ?? null,
      evidence_of_fit: input.evidenceOfFit ?? null,
      review_needs: input.reviewNeeds ?? null,
      expected_artifacts: input.expectedArtifacts ?? [],
      score: score.score,
      score_reasons: score.reasons,
    })
    .select("*")
    .single();
  if (proposalError || !proposalRow) {
    throw new Error(`Failed to create proposal: ${proposalError?.message ?? "unknown"}`);
  }

  await db
    .from("mission_work_packages")
    .update({ status: "proposal_review", updated_at: nowIso() })
    .eq("id", workPackage.id);
  await db
    .from("mission_problems")
    .update({ status: "proposal_review", updated_at: nowIso() })
    .eq("id", problemRow.id);

  return {
    proposal: asProposal(proposalRow),
    trust: trustSignals,
  };
}

export interface ApproveProposalInput {
  proposalId: string;
  supervisorAccountId: string;
  supervisorAgentId?: string | null;
  decisionNotes?: string | null;
}

export async function approveProposal(input: ApproveProposalInput) {
  const db = createAdminClient() as any;
  const { data: proposalRow } = await db.from("mission_proposals").select("*").eq("id", input.proposalId).maybeSingle();
  if (!proposalRow) throw new Error("Proposal not found");
  const proposal = asProposal(proposalRow);
  const { data: missionRow } = await db.from("missions").select("*").eq("id", proposal.mission_id).maybeSingle();
  const { data: laneRow } = await db.from("mission_lanes").select("*").eq("id", proposal.lane_id).maybeSingle();
  const { data: workPackageRow } = await db.from("mission_work_packages").select("*").eq("id", proposal.work_package_id).maybeSingle();
  if (!missionRow || !laneRow || !workPackageRow) {
    throw new Error("Proposal references incomplete mission state");
  }
  const lane = asMissionLane(laneRow);
  const trust = await loadTrustSignals(db, proposal.proposer_agent_id);
  const eligibility = deriveMissionEligibility({
    laneFrozen: lane.status === "frozen",
    missionTrustScore: trust.mission_trust_score,
    orchestrationScore: trust.orchestration_score,
    serviceHealthScore: trust.service_health_score,
    requiredMissionTrust: 0.4,
    requiredOrchestration: 0.35,
    requiredServiceHealth: 0.4,
  });
  if (!eligibility.eligible) {
    throw new Error(eligibility.reasons.join("; "));
  }

  const { data: runRow, error: runError } = await db
    .from("supervisor_runs")
    .insert({
      mission_id: proposal.mission_id,
      lane_id: proposal.lane_id,
      problem_id: proposal.problem_id,
      work_package_id: proposal.work_package_id,
      proposal_id: proposal.id,
      supervisor_account_id: input.supervisorAccountId,
      supervisor_agent_id: input.supervisorAgentId ?? null,
      status: "funded",
      budget_cap: proposal.requested_credits.toFixed(8),
      tranche_released: "0.00000000",
      acceptance_contract: {
        plan_summary: proposal.plan_summary,
        expected_artifacts: proposal.expected_artifacts,
      },
      escalation_policy: {
        admin_owner: input.supervisorAccountId,
        allow_clarification_pause: true,
      },
      metadata: {
        decision_notes: input.decisionNotes ?? null,
      },
    })
    .select("*")
    .single();
  if (runError || !runRow) {
    throw new Error(`Failed to create funded run: ${runError?.message ?? "unknown"}`);
  }

  const { data: stepRow, error: stepError } = await db
    .from("run_steps")
    .insert({
      run_id: runRow.id,
      title: "Initial mission delivery",
      objective: proposal.plan_summary,
      status: "active",
      assigned_agent_id: proposal.proposer_agent_id,
      budget_cap: proposal.requested_credits.toFixed(8),
      spent_credits: "0.00000000",
      metadata: {
        source: "proposal_approval",
      },
    })
    .select("*")
    .single();
  if (stepError || !stepRow) {
    throw new Error(`Failed to create initial run step: ${stepError?.message ?? "unknown"}`);
  }

  await db.from("delegation_contracts").insert({
    run_step_id: stepRow.id,
    objective: proposal.plan_summary,
    allowed_tools: ["analysis", "research", "verification"],
    forbidden_actions: ["unscoped_spend", "unsupervised_redirection"],
    required_outputs: proposal.expected_artifacts,
    evaluation_method: "review",
    review_path: ["planner", "execution", "reconciler"],
    escalation_target: {
      supervisor_account_id: input.supervisorAccountId,
      supervisor_agent_id: input.supervisorAgentId ?? null,
    },
    metadata: {
      review_needs: proposal.review_needs,
    },
  });

  await db
    .from("mission_proposals")
    .update({
      status: "approved",
      decision_notes: input.decisionNotes ?? null,
      updated_at: nowIso(),
    })
    .eq("id", proposal.id);
  await db
    .from("mission_work_packages")
    .update({ status: "funded", updated_at: nowIso() })
    .eq("id", proposal.work_package_id);
  await db
    .from("mission_problems")
    .update({ status: "funded", updated_at: nowIso() })
    .eq("id", proposal.problem_id);

  await db.from("mission_tranches").insert({
    mission_id: proposal.mission_id,
    lane_id: proposal.lane_id,
    run_id: runRow.id,
    tranche_kind: proposal.requested_tranche_kind,
    status: "reserved",
    amount: proposal.requested_credits.toFixed(8),
    reserved_amount: proposal.requested_credits.toFixed(8),
    released_amount: "0.00000000",
    spent_amount: "0.00000000",
    granted_to_agent_id: proposal.proposer_agent_id,
    notes: input.decisionNotes ?? "Proposal approved and funds reserved",
    created_by_account_id: input.supervisorAccountId,
  });

  await db
    .from("mission_treasuries")
    .update({
      reserved_credits: (toNumber((await db.from("mission_treasuries").select("reserved_credits").eq("mission_id", proposal.mission_id).single()).data?.reserved_credits) + proposal.requested_credits).toFixed(8),
      updated_at: nowIso(),
    })
    .eq("mission_id", proposal.mission_id);

  await db.from("run_events").insert({
    run_id: runRow.id,
    run_step_id: stepRow.id,
    event_type: "proposal_approved",
    summary: "Proposal approved and converted into a funded supervised run",
    payload: {
      proposal_id: proposal.id,
      requested_credits: proposal.requested_credits,
    },
    created_by_account_id: input.supervisorAccountId,
    created_by_agent_id: input.supervisorAgentId ?? null,
  });

  return getMissionDetail(proposal.mission_id);
}

export interface CreateRunInput {
  missionId: string;
  laneId: string;
  problemId: string;
  workPackageId: string;
  supervisorAccountId: string;
  supervisorAgentId?: string | null;
  title: string;
  objective: string;
  assignedAgentId?: string | null;
  budgetCap: number;
  trancheKind: TrancheKind;
  allowedTools?: string[];
  forbiddenActions?: string[];
  requiredOutputs?: string[];
}

export async function createSupervisorRun(input: CreateRunInput) {
  const db = createAdminClient() as any;
  const { data: runRow, error: runError } = await db
    .from("supervisor_runs")
    .insert({
      mission_id: input.missionId,
      lane_id: input.laneId,
      problem_id: input.problemId,
      work_package_id: input.workPackageId,
      supervisor_account_id: input.supervisorAccountId,
      supervisor_agent_id: input.supervisorAgentId ?? null,
      status: "funded",
      budget_cap: input.budgetCap.toFixed(8),
      tranche_released: "0.00000000",
      acceptance_contract: {
        title: input.title,
      },
      escalation_policy: {
        admin_owner: input.supervisorAccountId,
      },
      metadata: {},
    })
    .select("*")
    .single();
  if (runError || !runRow) {
    throw new Error(`Failed to create run: ${runError?.message ?? "unknown"}`);
  }

  const { data: stepRow, error: stepError } = await db
    .from("run_steps")
    .insert({
      run_id: runRow.id,
      title: input.title,
      objective: input.objective,
      status: "active",
      assigned_agent_id: input.assignedAgentId ?? null,
      budget_cap: input.budgetCap.toFixed(8),
      spent_credits: "0.00000000",
      metadata: {},
    })
    .select("*")
    .single();
  if (stepError || !stepRow) {
    throw new Error(`Failed to create initial run step: ${stepError?.message ?? "unknown"}`);
  }

  await db.from("delegation_contracts").insert({
    run_step_id: stepRow.id,
    objective: input.objective,
    allowed_tools: input.allowedTools ?? ["analysis", "research"],
    forbidden_actions: input.forbiddenActions ?? ["unapproved_scope_expansion"],
    required_outputs: input.requiredOutputs ?? [],
    evaluation_method: "review",
    review_path: ["planner", "execution", "reconciler"],
    escalation_target: { supervisor_account_id: input.supervisorAccountId },
    metadata: {},
  });

  await db.from("mission_tranches").insert({
    mission_id: input.missionId,
    lane_id: input.laneId,
    run_id: runRow.id,
    tranche_kind: input.trancheKind,
    status: "reserved",
    amount: input.budgetCap.toFixed(8),
    reserved_amount: input.budgetCap.toFixed(8),
    released_amount: "0.00000000",
    spent_amount: "0.00000000",
    granted_to_agent_id: input.assignedAgentId ?? null,
    notes: "Run manually created by admin",
    created_by_account_id: input.supervisorAccountId,
  });

  return asSupervisorRun(runRow);
}

export async function releaseRunTranche(runId: string, accountId: string) {
  const db = createAdminClient() as any;
  const [{ data: runRow }, { data: trancheRow }, { data: treasuryRow }] = await Promise.all([
    db.from("supervisor_runs").select("*").eq("id", runId).maybeSingle(),
    db.from("mission_tranches").select("*").eq("run_id", runId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db
      .from("mission_treasuries")
      .select("*")
      .eq(
        "mission_id",
        (await db.from("supervisor_runs").select("mission_id").eq("id", runId).single()).data?.mission_id,
      )
      .maybeSingle(),
  ]);

  if (!runRow || !trancheRow || !treasuryRow) {
    throw new Error("Run, tranche, or treasury not found");
  }

  const action = getNextTrancheAction({
    trancheKind: trancheRow.tranche_kind as TrancheKind,
    releasedAmount: toNumber(trancheRow.released_amount),
    spentAmount: toNumber(trancheRow.spent_amount),
    reservedAmount: toNumber(trancheRow.reserved_amount),
    reviewStatus: runRow.status,
    emergencyFreeze: Boolean(treasuryRow.emergency_freeze),
  });

  if (action.action === "freeze") {
    throw new Error(action.reason);
  }
  if (action.action === "hold") {
    return {
      action,
      run: asSupervisorRun(runRow),
    };
  }

  await db
    .from("mission_tranches")
    .update({
      status: "released",
      released_amount: trancheRow.amount,
      reserved_amount: "0.00000000",
      updated_at: nowIso(),
    })
    .eq("id", trancheRow.id);
  await db
    .from("supervisor_runs")
    .update({
      status: "active",
      tranche_released: trancheRow.amount,
      updated_at: nowIso(),
    })
    .eq("id", runId);
  await db
    .from("mission_treasuries")
    .update({
      reserved_credits: Math.max(0, toNumber(treasuryRow.reserved_credits) - toNumber(trancheRow.amount)).toFixed(8),
      spent_credits: toNumber(treasuryRow.spent_credits).toFixed(8),
      updated_at: nowIso(),
    })
    .eq("mission_id", runRow.mission_id);
  await db.from("run_events").insert({
    run_id: runId,
    event_type: "tranche_released",
    summary: action.reason,
    payload: {
      tranche_id: trancheRow.id,
      amount: toNumber(trancheRow.amount),
    },
    created_by_account_id: accountId,
  });

  return {
    action,
    run: asSupervisorRun({
      ...runRow,
      status: "active",
      tranche_released: trancheRow.amount,
      updated_at: nowIso(),
    }),
  };
}

export async function submitRunStep(input: {
  runStepId: string;
  agentId: string;
  summary: string;
  spentCredits?: number;
  artifactTitle?: string | null;
  artifactUri?: string | null;
  artifactContent?: Record<string, unknown>;
}) {
  const db = createAdminClient() as any;
  const { data: stepRow } = await db.from("run_steps").select("*").eq("id", input.runStepId).maybeSingle();
  if (!stepRow) throw new Error("Run step not found");
  if (stepRow.assigned_agent_id && stepRow.assigned_agent_id !== input.agentId) {
    throw new Error("This step is assigned to a different agent");
  }
  const spentCredits = Math.max(0, input.spentCredits ?? 0);
  await db
    .from("run_steps")
    .update({
      status: "waiting_for_review",
      spent_credits: (toNumber(stepRow.spent_credits) + spentCredits).toFixed(8),
      updated_at: nowIso(),
    })
    .eq("id", input.runStepId);
  await db
    .from("supervisor_runs")
    .update({ status: "waiting_for_review", updated_at: nowIso() })
    .eq("id", stepRow.run_id);

  await db.from("run_events").insert({
    run_id: stepRow.run_id,
    run_step_id: input.runStepId,
    event_type: "step_submitted",
    summary: input.summary,
    payload: {
      spent_credits: spentCredits,
    },
    created_by_agent_id: input.agentId,
  });

  if (spentCredits > 0) {
    const { data: runRow } = await db.from("supervisor_runs").select("mission_id").eq("id", stepRow.run_id).single();
    await db.from("credit_burn_events").insert({
      mission_id: runRow.mission_id,
      run_id: stepRow.run_id,
      run_step_id: input.runStepId,
      agent_id: input.agentId,
      amount: spentCredits.toFixed(8),
      burn_type: "execution",
      description: input.summary,
      metadata: input.artifactContent ?? {},
    });
    const { data: treasuryRow } = await db.from("mission_treasuries").select("*").eq("mission_id", runRow.mission_id).maybeSingle();
    if (treasuryRow) {
      await db
        .from("mission_treasuries")
        .update({
          spent_credits: (toNumber(treasuryRow.spent_credits) + spentCredits).toFixed(8),
          updated_at: nowIso(),
        })
        .eq("mission_id", runRow.mission_id);
    }
  }

  if (input.artifactTitle || input.artifactUri || input.artifactContent) {
    await db.from("run_artifacts").insert({
      run_id: stepRow.run_id,
      run_step_id: input.runStepId,
      artifact_type: "submission",
      title: input.artifactTitle ?? "Mission step submission",
      uri: input.artifactUri ?? null,
      content: input.artifactContent ?? {},
      visibility: "open",
      created_by_agent_id: input.agentId,
    });
  }
}

export async function requestRunStepClarification(input: {
  runStepId: string;
  agentId: string;
  summary: string;
  needs: string[];
}) {
  const db = createAdminClient() as any;
  const { data: stepRow } = await db.from("run_steps").select("*").eq("id", input.runStepId).maybeSingle();
  if (!stepRow) throw new Error("Run step not found");
  if (stepRow.assigned_agent_id && stepRow.assigned_agent_id !== input.agentId) {
    throw new Error("This step is assigned to a different agent");
  }

  await db
    .from("run_steps")
    .update({
      status: "waiting_for_clarification",
      updated_at: nowIso(),
      metadata: {
        ...safeObject(stepRow.metadata),
        clarification_needs: input.needs,
      },
    })
    .eq("id", input.runStepId);
  await db
    .from("supervisor_runs")
    .update({ status: "waiting_for_clarification", updated_at: nowIso() })
    .eq("id", stepRow.run_id);
  await db.from("run_events").insert({
    run_id: stepRow.run_id,
    run_step_id: input.runStepId,
    event_type: "clarification_requested",
    summary: input.summary,
    payload: {
      needs: input.needs,
    },
    created_by_agent_id: input.agentId,
  });
}

export async function createRunReview(input: {
  runId: string;
  runStepId?: string | null;
  reviewType: RunReviewType;
  reviewerAccountId?: string | null;
  reviewerAgentId?: string | null;
  decision: RunReviewDecision;
  summary?: string | null;
  evidenceFindings?: unknown[];
  rewardCredits?: number;
}) {
  const db = createAdminClient() as any;
  const { data: runRow } = await db.from("supervisor_runs").select("*").eq("id", input.runId).maybeSingle();
  if (!runRow) throw new Error("Run not found");

  const { data: reviewRow, error: reviewError } = await db
    .from("run_reviews")
    .insert({
      run_id: input.runId,
      run_step_id: input.runStepId ?? null,
      review_type: input.reviewType,
      reviewer_account_id: input.reviewerAccountId ?? null,
      reviewer_agent_id: input.reviewerAgentId ?? null,
      decision: input.decision,
      summary: input.summary ?? null,
      evidence_findings: input.evidenceFindings ?? [],
      submitted_at: nowIso(),
    })
    .select("*")
    .single();
  if (reviewError || !reviewRow) {
    throw new Error(`Failed to create run review: ${reviewError?.message ?? "unknown"}`);
  }

  if (input.runStepId) {
    const stepStatus =
      input.decision === "approve"
        ? input.reviewType === "reconciler"
          ? "reconciled"
          : "verified"
        : input.decision === "needs_changes"
          ? "rework_requested"
          : "active";
    await db.from("run_steps").update({ status: stepStatus, updated_at: nowIso() }).eq("id", input.runStepId);
  }

  const runStatus =
    input.decision === "approve"
      ? input.reviewType === "reconciler"
        ? "reconciled"
        : "verified"
      : input.decision === "needs_changes"
        ? "rework_requested"
        : "active";

  await db.from("supervisor_runs").update({ status: runStatus, updated_at: nowIso() }).eq("id", input.runId);
  await db.from("run_events").insert({
    run_id: input.runId,
    run_step_id: input.runStepId ?? null,
    event_type: "review_submitted",
    summary: input.summary ?? `${input.reviewType} review ${input.decision}`,
    payload: {
      review_type: input.reviewType,
      decision: input.decision,
    },
    created_by_account_id: input.reviewerAccountId ?? null,
    created_by_agent_id: input.reviewerAgentId ?? null,
  });

  if (input.rewardCredits && input.rewardCredits > 0 && input.reviewerAgentId) {
    await db.from("review_rewards").insert({
      mission_id: runRow.mission_id,
      run_review_id: reviewRow.id,
      agent_id: input.reviewerAgentId,
      amount: input.rewardCredits.toFixed(8),
    });
    await grantCredits(
      input.reviewerAgentId,
      input.rewardCredits,
      "review_reward",
      `Mission review reward for run ${input.runId}`,
      String(reviewRow.id),
    );
  }

  return asRunReview(reviewRow);
}

export async function getMissionTreasury(missionId: string) {
  const db = createAdminClient() as any;
  const [{ data: treasuryRow }, { data: trancheRows }, { data: reservationRows }, { data: burnRows }] =
    await Promise.all([
      db.from("mission_treasuries").select("*").eq("mission_id", missionId).maybeSingle(),
      db.from("mission_tranches").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
      db.from("credit_reservations").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
      db.from("credit_burn_events").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }).limit(50),
    ]);

  return {
    treasury: treasuryRow ? asMissionTreasury(treasuryRow) : null,
    tranches: (trancheRows ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      tranche_kind: row.tranche_kind as TrancheKind,
      status: row.status as TrancheStatus,
      amount: toNumber(row.amount),
      reserved_amount: toNumber(row.reserved_amount),
      released_amount: toNumber(row.released_amount),
      spent_amount: toNumber(row.spent_amount),
      run_id: row.run_id ? String(row.run_id) : null,
      lane_id: row.lane_id ? String(row.lane_id) : null,
      notes: row.notes ? String(row.notes) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    })),
    reservations: (reservationRows ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      run_id: row.run_id ? String(row.run_id) : null,
      run_step_id: row.run_step_id ? String(row.run_step_id) : null,
      agent_id: row.agent_id ? String(row.agent_id) : null,
      amount: toNumber(row.amount),
      status: String(row.status),
      reason: String(row.reason),
      created_at: String(row.created_at),
      released_at: row.released_at ? String(row.released_at) : null,
    })),
    burn_events: (burnRows ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      run_id: row.run_id ? String(row.run_id) : null,
      run_step_id: row.run_step_id ? String(row.run_step_id) : null,
      agent_id: row.agent_id ? String(row.agent_id) : null,
      amount: toNumber(row.amount),
      burn_type: String(row.burn_type),
      description: String(row.description),
      created_at: String(row.created_at),
    })),
  };
}

export async function getAgentMissionInbox(agentId: string): Promise<MissionInboxItem[]> {
  const db = createAdminClient() as any;
  const trust = await loadTrustSignals(db, agentId);
  const [
    { data: stepRows },
    { data: runRows },
    { data: workPackageRows },
    { data: laneRows },
  ] = await Promise.all([
    db.from("run_steps").select("*").eq("assigned_agent_id", agentId).order("updated_at", { ascending: false }),
    db
      .from("supervisor_runs")
      .select("*")
      .or(`supervisor_agent_id.eq.${agentId},proposal_id.in.()`)
      .order("updated_at", { ascending: false }),
    db.from("mission_work_packages").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(12),
    db.from("mission_lanes").select("*"),
  ]);

  const laneById = new Map<string, MissionLane>(
    (laneRows ?? []).map((row: Record<string, unknown>) => {
      const lane = asMissionLane(row);
      return [lane.id, lane];
    }),
  );

  const items: MissionInboxItem[] = [];

  for (const row of stepRows ?? []) {
    const step = asRunStep(row);
    items.push({
      id: step.id,
      kind:
        step.status === "waiting_for_clarification" ? "clarification_needed" : "assigned_step",
      title: step.title,
      description: step.objective,
      href: `/dashboard/missions?step=${step.id}`,
      status: step.status,
      priority: step.status === "waiting_for_clarification" ? 97 : 90,
      reasons: [
        step.status === "waiting_for_clarification"
          ? "Supervisor clarification is needed before work can continue"
          : "You are assigned to this mission step",
      ],
      metadata: {
        run_id: step.run_id,
        budget_cap: step.budget_cap,
      },
    });
  }

  for (const row of runRows ?? []) {
    const run = asSupervisorRun(row);
    if (run.supervisor_agent_id !== agentId) continue;
    items.push({
      id: run.id,
      kind: "assigned_run",
      title: "Supervise funded mission run",
      description: `Run ${run.id.slice(0, 8)} is ${run.status.replaceAll("_", " ")}`,
      href: `/admin/missions?run=${run.id}`,
      status: run.status,
      priority: 94,
      reasons: ["You are the supervisor for this funded mission run"],
      metadata: {
        mission_id: run.mission_id,
        tranche_released: run.tranche_released,
      },
    });
  }

  for (const row of workPackageRows ?? []) {
    const workPackage = asWorkPackage(row);
    const lane = laneById.get(workPackage.lane_id);
    const eligibility = deriveMissionEligibility({
      laneFrozen: lane?.status === "frozen",
      missionTrustScore: trust.mission_trust_score,
      orchestrationScore: trust.orchestration_score,
      serviceHealthScore: trust.service_health_score,
      requiredMissionTrust: 0.4,
      requiredOrchestration: 0.35,
      requiredServiceHealth: 0.4,
    });
    if (!eligibility.eligible) continue;

    items.push({
      id: workPackage.id,
      kind:
        workPackage.tranche_kind === "verification"
          ? "reproduction_call"
          : "proposal_opportunity",
      title: workPackage.title,
      description: workPackage.brief,
      href: `/dashboard/missions?workPackage=${workPackage.id}`,
      status: workPackage.status,
      priority: workPackage.tranche_kind === "verification" ? 86 : 74,
      reasons: [
        `Lane ${lane?.title ?? "unknown"} is open for bidding`,
        ...eligibility.reasons,
      ],
      metadata: {
        mission_id: workPackage.mission_id,
        lane_id: workPackage.lane_id,
        problem_id: workPackage.problem_id,
        posted_reward: workPackage.posted_reward,
        budget_cap: workPackage.budget_cap,
      },
    });
  }

  items.sort((left, right) => right.priority - left.priority);
  return items;
}
