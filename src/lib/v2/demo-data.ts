import type {
  AgentRuntimeView,
  CampaignRecord,
  CapabilityProfileRecord,
  DeliverableRecord,
  MountainExternalTargetRecord,
  MountainMembershipRecord,
  MountainRecord,
  ReputationScoreRecord,
  ReplanRecord,
  RewardSplitRecord,
  SupervisorOverview,
  SwarmSessionRecord,
  VerificationRunRecord,
  WorkLeaseRecord,
  WorkSpecRecord,
} from "./types";
import { buildFixtureRecords } from "./seed";

const fixtures = buildFixtureRecords();

export const demoMountains: MountainRecord[] = fixtures.mountains;
export const demoCampaigns: CampaignRecord[] = fixtures.campaigns;
export const demoWorkSpecs: WorkSpecRecord[] = fixtures.workSpecs;
export const demoWorkLeases: WorkLeaseRecord[] = fixtures.workLeases;
export const demoSwarmSessions: SwarmSessionRecord[] = fixtures.swarmSessions;
export const demoDeliverables: DeliverableRecord[] = fixtures.deliverables;
export const demoVerificationRuns: VerificationRunRecord[] = fixtures.verificationRuns;
export const demoReplans: ReplanRecord[] = fixtures.replans;
export const demoRewardSplits: RewardSplitRecord[] = fixtures.rewardSplits;
export const demoMountainMemberships: MountainMembershipRecord[] = fixtures.memberships;
export const demoMountainExternalTargets: MountainExternalTargetRecord[] = fixtures.externalTargets;

export function buildDemoSupervisorOverview(): SupervisorOverview {
  return {
    mountains: [],
    campaigns: demoCampaigns,
    work_specs: demoWorkSpecs,
    work_leases: demoWorkLeases,
    deliverables: demoDeliverables,
    verification_runs: demoVerificationRuns,
    replans: demoReplans,
    reward_splits: demoRewardSplits,
    swarm_sessions: demoSwarmSessions,
    system_metrics: {
      active_mountains: demoMountains.filter((mountain) => mountain.status === "active").length,
      blocked_specs: demoWorkSpecs.filter((spec) => spec.status === "blocked").length,
      overdue_checkpoints: demoWorkLeases.filter((lease) =>
        lease.checkpoint_due_at ? new Date(lease.checkpoint_due_at).getTime() < Date.now() : false
      ).length,
      contradiction_alerts: demoVerificationRuns.filter((run) => run.outcome === "contradiction").length,
      unsettled_rewards: demoRewardSplits.filter((reward) => reward.settlement_status !== "settled").length,
    },
  };
}

export function buildDemoAgentRuntime(): AgentRuntimeView {
  const capabilityProfile: CapabilityProfileRecord = {
    agent_id: "demo-agent",
    domain_tags: ["forecasting", "governance", "retrieval"],
    tool_access_classes: ["web", "analysis", "writing"],
    compute_profile: { context_window: "large", latency_bias: "balanced" },
    preferred_roles: ["reviewer", "verifier", "synthesizer"],
    collaboration_style: "checkpoint-heavy",
    replication_reliability: 83,
    synthesis_quality: 79,
    metadata: {},
    updated_at: demoMountains[0]?.updated_at ?? new Date().toISOString(),
  };

  const reputation: ReputationScoreRecord = {
    agent_id: "demo-agent",
    mission_reliability: 84,
    scientific_rigor: 87,
    collaboration_quality: 78,
    review_quality: 82,
    social_contribution: 61,
    deployment_health: 74,
    updated_at: demoMountains[0]?.updated_at ?? new Date().toISOString(),
  };

  return {
    current_assignments: demoWorkLeases.map((lease) => {
      const spec = demoWorkSpecs.find((candidate) => candidate.id === lease.work_spec_id);
      return {
        lease_id: lease.id,
        work_spec_id: lease.work_spec_id,
        mountain_id: lease.mountain_id,
        campaign_id: lease.campaign_id,
        title: spec?.title ?? "Assigned work package",
        summary: spec?.summary ?? "Supervisor-assigned work package.",
        role_type: spec?.role_type ?? "executor",
        status: lease.status,
        checkpoint_due_at: lease.checkpoint_due_at,
        expires_at: lease.expires_at,
        reward_envelope: spec?.reward_envelope ?? {},
        rationale: lease.rationale,
      };
    }),
    checkpoint_deadlines: demoWorkLeases.map((lease) => {
      const spec = demoWorkSpecs.find((candidate) => candidate.id === lease.work_spec_id);
      return {
        lease_id: lease.id,
        work_spec_id: lease.work_spec_id,
        mountain_id: lease.mountain_id,
        campaign_id: lease.campaign_id,
        title: spec?.title ?? "Assigned work package",
        summary: spec?.summary ?? "Supervisor-assigned work package.",
        role_type: spec?.role_type ?? "executor",
        status: lease.status,
        checkpoint_due_at: lease.checkpoint_due_at,
        expires_at: lease.expires_at,
        reward_envelope: spec?.reward_envelope ?? {},
        rationale: lease.rationale,
      };
    }),
    blocked_items: [],
    coalition_invites: demoSwarmSessions.map((session) => ({
      id: session.id,
      mountain_id: session.mountain_id,
      campaign_id: session.campaign_id,
      work_spec_id: session.work_spec_id,
      title: session.title,
      objective: session.objective,
      status: session.status,
      reliability_score:
        typeof session.credit_split_policy.reliability_score === "number"
          ? Number(session.credit_split_policy.reliability_score)
          : 50,
      role_breakdown: [],
      summary: session.objective,
    })),
    verification_requests: demoVerificationRuns,
    recommended_speculative_lines: demoWorkSpecs.filter((spec) => spec.speculative),
    mission_context: {
      mountains: [],
      campaigns: demoCampaigns,
      capability_profile: capabilityProfile,
      reputation,
    },
    supervisor_messages: [
      {
        id: "fixture-mission-directive",
        tone: "directive",
        subject: "Metaculus summit fixture",
        detail:
          "Development fixtures model the official Metaculus summit so local work matches the production mission shape.",
      },
      {
        id: "fixture-checkpoint-warning",
        tone: "warning",
        subject: "Checkpoint required",
        detail:
          "Compliance and forecast-comment work both require evidence-bearing checkpoints before renewal.",
      },
    ],
  };
}
