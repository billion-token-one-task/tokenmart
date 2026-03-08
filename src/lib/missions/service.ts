import { createAdminClient } from "@/lib/supabase/admin";
import { grantCredits } from "@/lib/admin/credits";
import {
  buildMissionInboxSummary,
  calculateMissionProposalScore,
  deriveMissionEligibility,
  prioritizeMissionInbox,
} from "@/lib/missions/policy";
import type {
  AgentMissionInbox,
  Mission,
  MissionDetail,
  MissionInboxItem,
  MissionLane,
  MissionProblem,
  MissionProposal,
  MissionTranche,
  MissionTreasury,
  SupervisorRun,
  RunStep,
} from "@/lib/missions/types";

type DbClient = any;
type DbRow = Record<string, unknown>;

function db(): DbClient {
  return createAdminClient() as any;
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function mapMission(row: DbRow): Mission {
  return {
    id: row.id as string,
    admin_account_id: row.admin_account_id as string,
    title: row.title as string,
    slug: row.slug as string,
    status: row.status as Mission["status"],
    visibility: row.visibility as Mission["visibility"],
    charter: row.charter as string,
    scientific_objective: row.scientific_objective as string,
    success_metric: row.success_metric as string,
    public_rationale: (row.public_rationale as string | null) ?? null,
    allowed_tool_classes: safeArray<string>(row.allowed_tool_classes),
    review_policy: safeObject(row.review_policy),
    output_visibility: row.output_visibility as Mission["output_visibility"],
    termination_conditions: (row.termination_conditions as string | null) ?? null,
    total_credit_budget: toNumber(row.total_credit_budget),
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapMissionLane(row: DbRow): MissionLane {
  return {
    id: row.id as string,
    mission_id: row.mission_id as string,
    title: row.title as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    status: row.status as MissionLane["status"],
    priority: toNumber(row.priority, 50),
    budget_ceiling:
      row.budget_ceiling === null || row.budget_ceiling === undefined
        ? null
        : toNumber(row.budget_ceiling),
    success_metric: (row.success_metric as string | null) ?? null,
    output_visibility: row.output_visibility as MissionLane["output_visibility"],
    allowed_tool_classes: safeArray<string>(row.allowed_tool_classes),
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapMissionProblem(row: DbRow): MissionProblem {
  return {
    id: row.id as string,
    mission_id: row.mission_id as string,
    lane_id: row.lane_id as string,
    title: row.title as string,
    slug: row.slug as string,
    description: row.description as string,
    status: row.status as MissionProblem["status"],
    work_type: row.work_type as MissionProblem["work_type"],
    budget_ceiling:
      row.budget_ceiling === null || row.budget_ceiling === undefined
        ? null
        : toNumber(row.budget_ceiling),
    artifact_spec: safeArray(row.artifact_spec),
    evidence_requirements: safeArray(row.evidence_requirements),
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapMissionProposal(row: DbRow): MissionProposal {
  return {
    id: row.id as string,
    mission_id: row.mission_id as string,
    lane_id: row.lane_id as string,
    problem_id: row.problem_id as string,
    proposing_agent_id: row.proposing_agent_id as string,
    coalition_id: (row.coalition_id as string | null) ?? null,
    status: row.status as MissionProposal["status"],
    plan_summary: row.plan_summary as string,
    full_plan: (row.full_plan as string | null) ?? null,
    requested_credits: toNumber(row.requested_credits),
    requested_tranche_type:
      row.requested_tranche_type as MissionProposal["requested_tranche_type"],
    confidence: toNumber(row.confidence),
    dependencies: safeArray(row.dependencies),
    evidence: safeArray(row.evidence),
    expected_artifacts: safeArray(row.expected_artifacts),
    review_needs: safeArray(row.review_needs),
    timeline_summary: (row.timeline_summary as string | null) ?? null,
    ranking_score: toNumber(row.ranking_score),
    review_notes: (row.review_notes as string | null) ?? null,
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapMissionTreasury(row: DbRow | null | undefined): MissionTreasury | null {
  if (!row) return null;
  return {
    mission_id: row.mission_id as string,
    total_credits: toNumber(row.total_credits),
    reserved_credits: toNumber(row.reserved_credits),
    burned_credits: toNumber(row.burned_credits),
    clawed_back_credits: toNumber(row.clawed_back_credits),
    bonus_pool_credits: toNumber(row.bonus_pool_credits),
    per_lane_ceiling:
      row.per_lane_ceiling === null || row.per_lane_ceiling === undefined
        ? null
        : toNumber(row.per_lane_ceiling),
    per_agent_ceiling:
      row.per_agent_ceiling === null || row.per_agent_ceiling === undefined
        ? null
        : toNumber(row.per_agent_ceiling),
    burst_allowance:
      row.burst_allowance === null || row.burst_allowance === undefined
        ? null
        : toNumber(row.burst_allowance),
    emergency_frozen: Boolean(row.emergency_frozen),
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapMissionTranche(row: DbRow): MissionTranche {
  return {
    id: row.id as string,
    mission_id: row.mission_id as string,
    lane_id: (row.lane_id as string | null) ?? null,
    run_id: (row.run_id as string | null) ?? null,
    released_by_account_id: (row.released_by_account_id as string | null) ?? null,
    tranche_type: row.tranche_type as MissionTranche["tranche_type"],
    status: row.status as MissionTranche["status"],
    credits: toNumber(row.credits),
    notes: (row.notes as string | null) ?? null,
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapSupervisorRun(row: DbRow): SupervisorRun {
  return {
    id: row.id as string,
    mission_id: row.mission_id as string,
    lane_id: (row.lane_id as string | null) ?? null,
    problem_id: (row.problem_id as string | null) ?? null,
    proposal_id: (row.proposal_id as string | null) ?? null,
    supervisor_account_id: (row.supervisor_account_id as string | null) ?? null,
    supervisor_agent_id: (row.supervisor_agent_id as string | null) ?? null,
    title: row.title as string,
    objective: row.objective as string,
    status: row.status as SupervisorRun["status"],
    acceptance_contract: (row.acceptance_contract as string | null) ?? null,
    allowed_tools: safeArray<string>(row.allowed_tools),
    forbidden_actions: safeArray<string>(row.forbidden_actions),
    budget_cap: toNumber(row.budget_cap),
    budget_allocated: toNumber(row.budget_allocated),
    escalation_policy: safeObject(row.escalation_policy),
    review_policy: safeObject(row.review_policy),
    due_at: (row.due_at as string | null) ?? null,
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapRunStep(row: DbRow): RunStep {
  return {
    id: row.id as string,
    run_id: row.run_id as string,
    parent_step_id: (row.parent_step_id as string | null) ?? null,
    assigned_agent_id: (row.assigned_agent_id as string | null) ?? null,
    title: row.title as string,
    objective: row.objective as string,
    status: row.status as RunStep["status"],
    tranche_type: row.tranche_type as RunStep["tranche_type"],
    budget_cap: toNumber(row.budget_cap),
    required_outputs: safeArray(row.required_outputs),
    evaluation_method: (row.evaluation_method as string | null) ?? null,
    review_path: safeArray(row.review_path),
    allowed_tools: safeArray<string>(row.allowed_tools),
    forbidden_actions: safeArray<string>(row.forbidden_actions),
    due_at: (row.due_at as string | null) ?? null,
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

async function getAgentSignals(agentId: string) {
  const client = db();
  const [{ data: daemonScore }, { data: profile }] = await Promise.all([
    client
      .from("daemon_scores")
      .select("service_health_score, orchestration_score")
      .eq("agent_id", agentId)
      .maybeSingle(),
    client
      .from("agent_profiles")
      .select("trust_score")
      .eq("agent_id", agentId)
      .maybeSingle(),
  ]);

  return {
    serviceHealth: toNumber(daemonScore?.service_health_score),
    orchestrationCapability: toNumber(daemonScore?.orchestration_score),
    missionTrust: toNumber(profile?.trust_score),
    marketTrust: toNumber(profile?.trust_score),
  };
}

export async function listMissionSummaries() {
  const client = db();
  const [
    { data: missionRows },
    { data: treasuryRows },
    { data: laneRows },
    { data: proposalRows },
    { data: runRows },
    { data: problemRows },
  ] = await Promise.all([
    client.from("missions").select("*").order("created_at", { ascending: false }),
    client.from("mission_treasuries").select("*"),
    client.from("mission_lanes").select("id, mission_id, status"),
    client.from("mission_proposals").select("id, mission_id, status"),
    client.from("supervisor_runs").select("id, mission_id, status"),
    client.from("mission_problems").select("id, mission_id, status"),
  ]);

  const treasuryByMissionId = new Map<string, MissionTreasury>();
  for (const row of treasuryRows ?? []) {
    const treasury = mapMissionTreasury(row as DbRow);
    if (treasury) treasuryByMissionId.set(treasury.mission_id, treasury);
  }

  return (missionRows ?? []).map((row: DbRow) => {
    const mission = mapMission(row);
    const treasury = treasuryByMissionId.get(mission.id) ?? null;
    const missionLanes = (laneRows ?? []).filter((lane: DbRow) => lane.mission_id === mission.id);
    const missionProblems = (problemRows ?? []).filter((problem: DbRow) => problem.mission_id === mission.id);
    const missionProposals = (proposalRows ?? []).filter((proposal: DbRow) => proposal.mission_id === mission.id);
    const missionRuns = (runRows ?? []).filter((run: DbRow) => run.mission_id === mission.id);

    return {
      mission,
      treasury,
      lane_count: missionLanes.length,
      open_problem_count: missionProblems.filter((problem) => problem.status === "open").length,
      proposal_count: missionProposals.length,
      open_bid_count: missionProposals.filter((proposal) =>
        ["submitted", "shortlisted"].includes(String(proposal.status)),
      ).length,
      active_run_count: missionRuns.filter((run) =>
        ["funded", "active", "waiting_for_review", "waiting_for_clarification", "blocked"].includes(String(run.status)),
      ).length,
      blocked_run_count: missionRuns.filter((run) => run.status === "blocked").length,
    };
  });
}

export async function getMissionDetail(missionId: string): Promise<MissionDetail | null> {
  const client = db();
  const [
    { data: missionRow },
    { data: treasuryRow },
    { data: laneRows },
    { data: problemRows },
    { data: proposalRows },
    { data: runRows },
    { data: trancheRows },
  ] = await Promise.all([
    client.from("missions").select("*").eq("id", missionId).maybeSingle(),
    client.from("mission_treasuries").select("*").eq("mission_id", missionId).maybeSingle(),
    client.from("mission_lanes").select("*").eq("mission_id", missionId).order("priority", { ascending: false }),
    client.from("mission_problems").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
    client.from("mission_proposals").select("*").eq("mission_id", missionId).order("ranking_score", { ascending: false }),
    client.from("supervisor_runs").select("*").eq("mission_id", missionId).order("updated_at", { ascending: false }),
    client.from("mission_tranches").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
  ]);

  if (!missionRow) return null;

  return {
    mission: mapMission(missionRow as DbRow),
    treasury: mapMissionTreasury(treasuryRow as DbRow | null),
    lanes: (laneRows ?? []).map((row: DbRow) => mapMissionLane(row)),
    problems: (problemRows ?? []).map((row: DbRow) => mapMissionProblem(row)),
    proposals: (proposalRows ?? []).map((row: DbRow) => mapMissionProposal(row)),
    runs: (runRows ?? []).map((row: DbRow) => mapSupervisorRun(row)),
    tranches: (trancheRows ?? []).map((row: DbRow) => mapMissionTranche(row)),
  };
}

export async function createMission(input: {
  adminAccountId: string;
  title: string;
  charter: string;
  scientificObjective: string;
  successMetric: string;
  publicRationale?: string | null;
  totalCreditBudget?: number;
  allowedToolClasses?: string[];
  reviewPolicy?: Record<string, unknown>;
  outputVisibility?: Mission["output_visibility"];
  terminationConditions?: string | null;
  treasury?: {
    perLaneCeiling?: number | null;
    perAgentCeiling?: number | null;
    burstAllowance?: number | null;
    bonusPoolCredits?: number | null;
  };
}) {
  const client = db();
  const slug = slugify(input.title);
  const totalCreditBudget = Math.max(0, input.totalCreditBudget ?? 0);
  const { data: missionRow, error: missionError } = await client
    .from("missions")
    .insert({
      admin_account_id: input.adminAccountId,
      title: input.title,
      slug,
      charter: input.charter,
      scientific_objective: input.scientificObjective,
      success_metric: input.successMetric,
      public_rationale: input.publicRationale ?? null,
      total_credit_budget: totalCreditBudget.toFixed(8),
      allowed_tool_classes: input.allowedToolClasses ?? [],
      review_policy: input.reviewPolicy ?? {},
      output_visibility: input.outputVisibility ?? "open",
      termination_conditions: input.terminationConditions ?? null,
      status: "active",
    })
    .select("*")
    .single();

  if (missionError || !missionRow) {
    throw new Error(`Failed to create mission: ${missionError?.message ?? "unknown"}`);
  }

  const { error: treasuryError } = await client.from("mission_treasuries").insert({
    mission_id: missionRow.id,
    total_credits: totalCreditBudget.toFixed(8),
    bonus_pool_credits: Math.max(0, input.treasury?.bonusPoolCredits ?? 0).toFixed(8),
    per_lane_ceiling:
      input.treasury?.perLaneCeiling === null || input.treasury?.perLaneCeiling === undefined
        ? null
        : input.treasury.perLaneCeiling.toFixed(8),
    per_agent_ceiling:
      input.treasury?.perAgentCeiling === null || input.treasury?.perAgentCeiling === undefined
        ? null
        : input.treasury.perAgentCeiling.toFixed(8),
    burst_allowance:
      input.treasury?.burstAllowance === null || input.treasury?.burstAllowance === undefined
        ? null
        : input.treasury.burstAllowance.toFixed(8),
  });

  if (treasuryError) {
    throw new Error(`Mission created but treasury initialization failed: ${treasuryError.message}`);
  }

  return getMissionDetail(missionRow.id);
}

export async function createMissionLane(input: {
  missionId: string;
  title: string;
  description?: string | null;
  priority?: number;
  budgetCeiling?: number | null;
  successMetric?: string | null;
  outputVisibility?: MissionLane["output_visibility"];
  allowedToolClasses?: string[];
}) {
  const client = db();
  const { data, error } = await client
    .from("mission_lanes")
    .insert({
      mission_id: input.missionId,
      title: input.title,
      slug: slugify(input.title),
      description: input.description ?? null,
      priority: input.priority ?? 50,
      budget_ceiling:
        input.budgetCeiling === null || input.budgetCeiling === undefined
          ? null
          : input.budgetCeiling.toFixed(8),
      success_metric: input.successMetric ?? null,
      output_visibility: input.outputVisibility ?? "open",
      allowed_tool_classes: input.allowedToolClasses ?? [],
      status: "open",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create mission lane: ${error?.message ?? "unknown"}`);
  }

  return mapMissionLane(data as DbRow);
}

export async function createMissionProblem(input: {
  missionId: string;
  laneId: string;
  title: string;
  description: string;
  workType?: MissionProblem["work_type"];
  budgetCeiling?: number | null;
  artifactSpec?: unknown[];
  evidenceRequirements?: unknown[];
}) {
  const client = db();
  const { data, error } = await client
    .from("mission_problems")
    .insert({
      mission_id: input.missionId,
      lane_id: input.laneId,
      title: input.title,
      slug: slugify(input.title),
      description: input.description,
      work_type: input.workType ?? "execution",
      budget_ceiling:
        input.budgetCeiling === null || input.budgetCeiling === undefined
          ? null
          : input.budgetCeiling.toFixed(8),
      artifact_spec: input.artifactSpec ?? [],
      evidence_requirements: input.evidenceRequirements ?? [],
      status: "open",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create mission problem: ${error?.message ?? "unknown"}`);
  }

  return mapMissionProblem(data as DbRow);
}

export async function createMissionProposal(input: {
  missionId: string;
  laneId: string;
  problemId: string;
  agentId: string;
  coalitionId?: string | null;
  planSummary: string;
  fullPlan?: string | null;
  requestedCredits: number;
  requestedTrancheType?: MissionProposal["requested_tranche_type"];
  confidence: number;
  dependencies?: unknown[];
  evidence?: unknown[];
  expectedArtifacts?: unknown[];
  reviewNeeds?: unknown[];
  timelineSummary?: string | null;
}) {
  const client = db();
  const [
    { data: problemRow, error: problemError },
    agentSignals,
    { count: activeReviews },
  ] = await Promise.all([
    client
      .from("mission_problems")
      .select("*")
      .eq("id", input.problemId)
      .maybeSingle(),
    getAgentSignals(input.agentId),
    client
      .from("peer_reviews")
      .select("id", { count: "exact", head: true })
      .eq("reviewer_agent_id", input.agentId)
      .is("decision", null),
  ]);

  if (problemError || !problemRow) {
    throw new Error(`Mission problem not found: ${problemError?.message ?? "unknown"}`);
  }

  const rankingScore = calculateMissionProposalScore({
    requestedCredits: input.requestedCredits,
    estimatedImpact: Math.max(0.2, Math.min(1, toNumber(problemRow.budget_ceiling, input.requestedCredits) / Math.max(input.requestedCredits, 1) * 0.5)),
    laneFit: 0.82,
    confidence: input.confidence,
    priorMissionTrust: agentSignals.missionTrust / 100,
    priorOrchestrationCapability: agentSignals.orchestrationCapability / 100,
    diversityBoost: input.coalitionId ? 0.2 : 0.1,
    correlationRisk: activeReviews && activeReviews > 8 ? 0.35 : 0.12,
  });

  const { data, error } = await client
    .from("mission_proposals")
    .insert({
      mission_id: input.missionId,
      lane_id: input.laneId,
      problem_id: input.problemId,
      proposing_agent_id: input.agentId,
      coalition_id: input.coalitionId ?? null,
      plan_summary: input.planSummary,
      full_plan: input.fullPlan ?? null,
      requested_credits: input.requestedCredits.toFixed(8),
      requested_tranche_type: input.requestedTrancheType ?? "execution",
      confidence: input.confidence,
      dependencies: input.dependencies ?? [],
      evidence: input.evidence ?? [],
      expected_artifacts: input.expectedArtifacts ?? [],
      review_needs: input.reviewNeeds ?? [],
      timeline_summary: input.timelineSummary ?? null,
      ranking_score: rankingScore,
      status: "submitted",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create proposal: ${error?.message ?? "unknown"}`);
  }

  return mapMissionProposal(data as DbRow);
}

export async function approveMissionProposal(input: {
  proposalId: string;
  supervisorAccountId: string;
  supervisorAgentId?: string | null;
  acceptanceContract?: string | null;
  initialStepTitle?: string;
  initialStepObjective?: string;
}) {
  const client = db();
  const { data: proposalRow, error: proposalError } = await client
    .from("mission_proposals")
    .select("*")
    .eq("id", input.proposalId)
    .maybeSingle();

  if (proposalError || !proposalRow) {
    throw new Error(`Proposal not found: ${proposalError?.message ?? "unknown"}`);
  }

  const proposal = mapMissionProposal(proposalRow as DbRow);
  const eligibility = await getAgentSignals(proposal.proposing_agent_id).then((signals) =>
    deriveMissionEligibility({
      serviceHealth: signals.serviceHealth,
      orchestrationCapability: signals.orchestrationCapability,
      missionTrust: signals.missionTrust,
      marketTrust: signals.marketTrust,
      reviewerLoad: 0.25,
      correlationRisk: 0.12,
      minimums: {
        serviceHealth: 35,
        orchestrationCapability: 30,
        missionTrust: 20,
        marketTrust: 20,
        maxCorrelationRisk: 0.6,
        maxReviewerLoad: 1,
      },
    }),
  );

  if (!eligibility.eligible) {
    throw new Error(`Proposal is not eligible: ${eligibility.reasons.join("; ")}`);
  }

  await client
    .from("mission_proposals")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal.id);

  await client
    .from("mission_problems")
    .update({
      status: "funded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal.problem_id);

  const { data: runRow, error: runError } = await client
    .from("supervisor_runs")
    .insert({
      mission_id: proposal.mission_id,
      lane_id: proposal.lane_id,
      problem_id: proposal.problem_id,
      proposal_id: proposal.id,
      supervisor_account_id: input.supervisorAccountId,
      supervisor_agent_id: input.supervisorAgentId ?? null,
      title: `Run for ${proposal.plan_summary.slice(0, 72)}`,
      objective: proposal.plan_summary,
      status: "funded",
      acceptance_contract:
        input.acceptanceContract ??
        "Deliver the proposal according to the requested artifacts, evidence, and review path.",
      budget_cap: proposal.requested_credits.toFixed(8),
      budget_allocated: "0",
      allowed_tools: [],
      forbidden_actions: [],
      review_policy: { stages: ["planner", "execution", "reconciler"] },
      escalation_policy: { max_attempts: 2, escalate_to: "admin" },
      metadata: {
        requested_tranche_type: proposal.requested_tranche_type,
        requested_dependencies: proposal.dependencies,
      },
    })
    .select("*")
    .single();

  if (runError || !runRow) {
    throw new Error(`Failed to create supervised run: ${runError?.message ?? "unknown"}`);
  }

  const run = mapSupervisorRun(runRow as DbRow);

  const { error: stepError } = await client.from("run_steps").insert({
    run_id: run.id,
    assigned_agent_id: proposal.proposing_agent_id,
    title: input.initialStepTitle ?? "Primary execution package",
    objective:
      input.initialStepObjective ??
      "Advance the approved proposal, publish evidence, and request review when outputs are ready.",
    status: "funded",
    tranche_type: proposal.requested_tranche_type,
    budget_cap: proposal.requested_credits.toFixed(8),
    required_outputs: proposal.expected_artifacts,
    review_path: proposal.review_needs,
    allowed_tools: [],
    forbidden_actions: [],
  });

  if (stepError) {
    throw new Error(`Run created but initial step failed: ${stepError.message}`);
  }

  await client.from("credit_reservations").insert({
    mission_id: proposal.mission_id,
    lane_id: proposal.lane_id,
    proposal_id: proposal.id,
    run_id: run.id,
    reserved_for_agent_id: proposal.proposing_agent_id,
    reservation_kind: "proposal_hold",
    status: "active",
    credits: proposal.requested_credits.toFixed(8),
  });

  await client.from("run_events").insert({
    run_id: run.id,
    actor_account_id: input.supervisorAccountId,
    actor_agent_id: input.supervisorAgentId ?? null,
    kind: "proposal_approved",
    summary: "Proposal approved and promoted into a funded supervisor run.",
    payload: {
      proposal_id: proposal.id,
      requested_credits: proposal.requested_credits,
    },
  });

  return getMissionDetail(proposal.mission_id);
}

export async function releaseMissionRunTranche(input: {
  runId: string;
  missionId: string;
  laneId?: string | null;
  releasedByAccountId: string;
  trancheType: MissionTranche["tranche_type"];
  credits: number;
  recipientAgentId?: string | null;
  notes?: string | null;
}) {
  const client = db();
  const credits = Math.max(0, input.credits);
  const { data: treasuryRow, error: treasuryError } = await client
    .from("mission_treasuries")
    .select("*")
    .eq("mission_id", input.missionId)
    .maybeSingle();

  const treasury = mapMissionTreasury(treasuryRow as DbRow | null);
  if (treasuryError || !treasury) {
    throw new Error(`Treasury not found: ${treasuryError?.message ?? "unknown"}`);
  }
  if (treasury.emergency_frozen) {
    throw new Error("Mission treasury is frozen");
  }

  const available =
    treasury.total_credits - treasury.reserved_credits - treasury.burned_credits;
  if (credits > available) {
    throw new Error("Requested tranche exceeds available mission credits");
  }

  const { data: trancheRow, error: trancheError } = await client
    .from("mission_tranches")
    .insert({
      mission_id: input.missionId,
      lane_id: input.laneId ?? null,
      run_id: input.runId,
      released_by_account_id: input.releasedByAccountId,
      tranche_type: input.trancheType,
      credits: credits.toFixed(8),
      notes: input.notes ?? null,
      status: "released",
    })
    .select("*")
    .single();

  if (trancheError || !trancheRow) {
    throw new Error(`Failed to release tranche: ${trancheError?.message ?? "unknown"}`);
  }

  await client
    .from("mission_treasuries")
    .update({
      reserved_credits: (treasury.reserved_credits + credits).toFixed(8),
      updated_at: new Date().toISOString(),
    })
    .eq("mission_id", input.missionId);

  await client
    .from("supervisor_runs")
    .update({
      budget_allocated: credits.toFixed(8),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.runId);

  if (input.recipientAgentId) {
    await client.from("credit_reservations").insert({
      mission_id: input.missionId,
      lane_id: input.laneId ?? null,
      run_id: input.runId,
      reserved_for_agent_id: input.recipientAgentId,
      reservation_kind: "run_budget",
      status: "active",
      credits: credits.toFixed(8),
      notes: input.notes ?? null,
    });

    await grantCredits(
      input.recipientAgentId,
      credits,
      "mission_tranche",
      `Mission tranche released for run ${input.runId}`,
      trancheRow.id,
    );
  }

  return mapMissionTranche(trancheRow as DbRow);
}

export async function submitMissionRunStep(input: {
  stepId: string;
  agentId: string;
  summary: string;
  artifactTitle?: string | null;
  artifactUri?: string | null;
  artifactBody?: string | null;
  creditsBurned?: number | null;
}) {
  const client = db();
  const { data: stepRow, error: stepError } = await client
    .from("run_steps")
    .select("*")
    .eq("id", input.stepId)
    .maybeSingle();

  if (stepError || !stepRow) {
    throw new Error(`Run step not found: ${stepError?.message ?? "unknown"}`);
  }
  const step = mapRunStep(stepRow as DbRow);
  if (step.assigned_agent_id && step.assigned_agent_id !== input.agentId) {
    throw new Error("This step is not assigned to the calling agent");
  }

  await client
    .from("run_steps")
    .update({
      status: "waiting_for_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.stepId);

  await client
    .from("supervisor_runs")
    .update({
      status: "waiting_for_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", step.run_id);

  await client.from("run_artifacts").insert({
    run_id: step.run_id,
    step_id: step.id,
    created_by_agent_id: input.agentId,
    artifact_kind: "submission",
    title: input.artifactTitle ?? "Submitted work artifact",
    uri: input.artifactUri ?? null,
    body: input.artifactBody ?? input.summary,
  });

  await client.from("run_events").insert({
    run_id: step.run_id,
    step_id: step.id,
    actor_agent_id: input.agentId,
    kind: "step_submitted",
    summary: input.summary,
  });

  if (input.creditsBurned && input.creditsBurned > 0) {
    const { data: runRow } = await client
      .from("supervisor_runs")
      .select("mission_id, lane_id")
      .eq("id", step.run_id)
      .maybeSingle();
    if (runRow) {
      const { data: treasuryRow } = await client
        .from("mission_treasuries")
        .select("*")
        .eq("mission_id", runRow.mission_id)
        .maybeSingle();
      const treasury = mapMissionTreasury(treasuryRow as DbRow | null);
      if (treasury) {
        await client
          .from("mission_treasuries")
          .update({
            reserved_credits: Math.max(0, treasury.reserved_credits - input.creditsBurned).toFixed(8),
            burned_credits: (treasury.burned_credits + input.creditsBurned).toFixed(8),
            updated_at: new Date().toISOString(),
          })
          .eq("mission_id", runRow.mission_id);
      }

      await client.from("credit_burn_events").insert({
        mission_id: runRow.mission_id,
        lane_id: runRow.lane_id ?? null,
        run_id: step.run_id,
        step_id: step.id,
        agent_id: input.agentId,
        credits: input.creditsBurned.toFixed(8),
        notes: "Mission step submission burn",
      });
    }
  }

  return { ok: true };
}

export async function requestMissionRunStepClarification(input: {
  stepId: string;
  agentId: string;
  summary: string;
}) {
  const client = db();
  const { data: stepRow, error } = await client
    .from("run_steps")
    .select("*")
    .eq("id", input.stepId)
    .maybeSingle();

  if (error || !stepRow) {
    throw new Error(`Run step not found: ${error?.message ?? "unknown"}`);
  }
  const step = mapRunStep(stepRow as DbRow);

  await client
    .from("run_steps")
    .update({
      status: "waiting_for_clarification",
      updated_at: new Date().toISOString(),
    })
    .eq("id", step.id);

  await client
    .from("supervisor_runs")
    .update({
      status: "waiting_for_clarification",
      updated_at: new Date().toISOString(),
    })
    .eq("id", step.run_id);

  await client.from("run_events").insert({
    run_id: step.run_id,
    step_id: step.id,
    actor_agent_id: input.agentId,
    kind: "clarification_requested",
    summary: input.summary,
  });

  return { ok: true };
}

export async function createMissionRunReview(input: {
  missionId: string;
  runId: string;
  stepId?: string | null;
  reviewType: "planner" | "execution" | "reconciler" | "replication" | "adversarial";
  reviewerAccountId?: string | null;
  reviewerAgentId?: string | null;
  decision: "pending" | "approve" | "reject" | "needs_changes";
  summary?: string | null;
  findings?: unknown[];
  rewardCredits?: number | null;
}) {
  const client = db();
  const { data: reviewRow, error } = await client
    .from("run_reviews")
    .insert({
      mission_id: input.missionId,
      run_id: input.runId,
      step_id: input.stepId ?? null,
      review_type: input.reviewType,
      reviewer_account_id: input.reviewerAccountId ?? null,
      reviewer_agent_id: input.reviewerAgentId ?? null,
      decision: input.decision,
      summary: input.summary ?? null,
      findings: input.findings ?? [],
      submitted_at: input.decision === "pending" ? null : new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !reviewRow) {
    throw new Error(`Failed to create run review: ${error?.message ?? "unknown"}`);
  }

  const nextStatus =
    input.reviewType === "reconciler" && input.decision === "approve"
      ? "reconciled"
      : input.decision === "approve"
        ? "verified"
        : input.decision === "needs_changes"
          ? "rework_requested"
          : input.decision === "reject"
            ? "blocked"
            : null;

  if (nextStatus) {
    await client
      .from("supervisor_runs")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.runId);

    if (input.stepId) {
      await client
        .from("run_steps")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.stepId);
    }
  }

  await client.from("run_events").insert({
    run_id: input.runId,
    step_id: input.stepId ?? null,
    actor_account_id: input.reviewerAccountId ?? null,
    actor_agent_id: input.reviewerAgentId ?? null,
    kind: "review_submitted",
    summary:
      input.summary ??
      `${input.reviewType} review recorded with decision ${input.decision}.`,
    payload: { decision: input.decision, findings: input.findings ?? [] },
  });

  if (
    input.rewardCredits &&
    input.rewardCredits > 0 &&
    input.reviewerAgentId &&
    input.decision !== "pending"
  ) {
    await db().from("review_rewards").insert({
      mission_id: input.missionId,
      run_id: input.runId,
      reviewer_agent_id: input.reviewerAgentId,
      run_review_id: reviewRow.id,
      credits: input.rewardCredits.toFixed(8),
      status: "granted",
    });

    await grantCredits(
      input.reviewerAgentId,
      input.rewardCredits,
      "review_reward",
      `Mission review reward for run ${input.runId}`,
      reviewRow.id,
    );
  }

  return reviewRow;
}

export async function getMissionTreasurySnapshot(missionId: string) {
  const client = db();
  const [{ data: treasuryRow }, { data: trancheRows }, { data: reservationRows }, { data: burnRows }] =
    await Promise.all([
      client.from("mission_treasuries").select("*").eq("mission_id", missionId).maybeSingle(),
      client.from("mission_tranches").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
      client.from("credit_reservations").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
      client.from("credit_burn_events").select("*").eq("mission_id", missionId).order("created_at", { ascending: false }),
    ]);

  return {
    treasury: mapMissionTreasury(treasuryRow as DbRow | null),
    tranches: (trancheRows ?? []).map((row: DbRow) => mapMissionTranche(row)),
    reservations: reservationRows ?? [],
    burn_events: burnRows ?? [],
  };
}

export async function listAgentMissionInbox(agentId: string): Promise<AgentMissionInbox> {
  const client = db();
  const [{ data: runStepRows }, { data: proposalRows }, { data: runRows }, { data: reviewRows }, { data: missionRows }] =
    await Promise.all([
      client
        .from("run_steps")
        .select("*")
        .eq("assigned_agent_id", agentId)
        .in("status", ["funded", "active", "waiting_for_dependency", "waiting_for_clarification", "waiting_for_review", "blocked"]),
      client
        .from("mission_proposals")
        .select("*")
        .eq("proposing_agent_id", agentId)
        .in("status", ["submitted", "shortlisted", "approved"]),
      client
        .from("supervisor_runs")
        .select("*")
        .eq("supervisor_agent_id", agentId)
        .in("status", ["funded", "active", "waiting_for_review", "waiting_for_clarification", "blocked"]),
      client
        .from("run_reviews")
        .select("*")
        .eq("reviewer_agent_id", agentId)
        .eq("decision", "pending"),
      client
        .from("missions")
        .select("id, title"),
    ]);

  const missionTitleById = new Map<string, string>(
    (missionRows ?? []).map((row: DbRow) => [row.id as string, row.title as string]),
  );

  const items: Array<import("@/lib/missions/policy").MissionInboxItem> = [];
  const uiItems: MissionInboxItem[] = [];

  for (const row of runStepRows ?? []) {
    const step = mapRunStep(row as DbRow);
    items.push({
      id: step.id,
      kind: step.status === "blocked" ? "blocked_run" : "assigned_step",
      urgency: step.status === "waiting_for_review" ? 0.8 : step.status === "blocked" ? 0.92 : 0.66,
      missionPriority: 0.85,
      dependencyPressure: step.status === "waiting_for_dependency" ? 0.9 : 0.35,
      reviewPressure: step.status === "waiting_for_review" ? 0.9 : 0.2,
      blocked: step.status === "blocked",
      title: step.title,
    });
    uiItems.push({
      id: step.id,
      kind: "assigned_step",
      title: step.title,
      subtitle: step.objective,
      status: step.status,
      href: "/dashboard/missions",
      priority_score: 0,
      mission_id: null,
      run_id: step.run_id,
      metadata: {
        due_at: step.due_at,
        tranche_type: step.tranche_type,
      },
    });
  }

  for (const row of proposalRows ?? []) {
    const proposal = mapMissionProposal(row as DbRow);
    items.push({
      id: proposal.id,
      kind: "proposal_update",
      urgency: proposal.status === "approved" ? 0.72 : 0.45,
      missionPriority: 0.6,
      dependencyPressure: 0.18,
      reviewPressure: proposal.status === "shortlisted" ? 0.55 : 0.15,
      blocked: false,
      title: proposal.plan_summary,
    });
    uiItems.push({
      id: proposal.id,
      kind: "proposal_update",
      title: proposal.plan_summary,
      subtitle: `Proposal ${proposal.status} in ${missionTitleById.get(proposal.mission_id) ?? "mission"}`,
      status: proposal.status,
      href: "/dashboard/missions",
      priority_score: 0,
      mission_id: proposal.mission_id,
      run_id: null,
      metadata: {
        ranking_score: proposal.ranking_score,
        requested_credits: proposal.requested_credits,
      },
    });
  }

  for (const row of reviewRows ?? []) {
    const review = row as DbRow;
    items.push({
      id: review.id as string,
      kind: "pending_review",
      urgency: 0.9,
      missionPriority: 0.9,
      dependencyPressure: 0.5,
      reviewPressure: 1,
      blocked: false,
      title: `Pending ${review.review_type as string} review`,
    });
    uiItems.push({
      id: review.id as string,
      kind: "pending_review",
      title: `Pending ${review.review_type as string} review`,
      subtitle: "A funded mission run is waiting on your decision.",
      status: review.decision as string,
      href: "/dashboard/missions",
      priority_score: 0,
      mission_id: review.mission_id as string,
      run_id: review.run_id as string,
      metadata: {},
    });
  }

  for (const row of runRows ?? []) {
    const run = mapSupervisorRun(row as DbRow);
    items.push({
      id: run.id,
      kind: run.status === "blocked" ? "blocked_run" : "supervisor_run",
      urgency: run.status === "blocked" ? 0.95 : 0.74,
      missionPriority: 1,
      dependencyPressure: run.status === "waiting_for_dependency" ? 0.82 : 0.24,
      reviewPressure: run.status === "waiting_for_review" ? 0.84 : 0.2,
      blocked: run.status === "blocked",
      title: run.title,
    });
    uiItems.push({
      id: run.id,
      kind: "supervisor_run",
      title: run.title,
      subtitle: run.objective,
      status: run.status,
      href: "/dashboard/missions",
      priority_score: 0,
      mission_id: run.mission_id,
      run_id: run.id,
      metadata: {
        budget_allocated: run.budget_allocated,
        budget_cap: run.budget_cap,
      },
    });
  }

  const prioritized = prioritizeMissionInbox(items);
  const scoreById = new Map(prioritized.map((item) => [item.id, item.priorityScore]));
  const summary = buildMissionInboxSummary({
    missionCount: new Set(uiItems.map((item) => item.mission_id).filter(Boolean)).size,
    activeRuns: runRows?.length ?? 0,
    blockedRuns: uiItems.filter((item) => item.status === "blocked").length,
    pendingClarifications: uiItems.filter((item) => item.status === "waiting_for_clarification").length,
    pendingReviews: reviewRows?.length ?? 0,
    openBids: proposalRows?.filter((row: DbRow) => ["submitted", "shortlisted"].includes(String(row.status))).length ?? 0,
    fundedRuns: uiItems.filter((item) => item.status === "funded").length,
  });

  return {
    items: uiItems
      .map((item) => ({
        ...item,
        priority_score: scoreById.get(item.id) ?? 0,
      }))
      .sort((left, right) => right.priority_score - left.priority_score),
    summary,
  };
}
