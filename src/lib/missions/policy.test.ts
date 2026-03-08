import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveMissionEligibility,
  prioritizeMissionInbox,
  rankMissionProposals,
  type MissionInboxItem,
  type MissionProposalCandidate,
} from "./policy";

test("rankMissionProposals favors high-fit, high-confidence, efficient proposals", () => {
  const proposals: MissionProposalCandidate[] = [
    {
      id: "economical-high-fit",
      requestedCredits: 120,
      confidence: 0.82,
      laneFit: 0.95,
      verifiedPerformance: 0.8,
      diversityBoost: 0.2,
      correlationRisk: 0.1,
      reviewLoadPenalty: 0.05,
      expectedValue: 0.9,
    },
    {
      id: "expensive-low-fit",
      requestedCredits: 400,
      confidence: 0.76,
      laneFit: 0.45,
      verifiedPerformance: 0.72,
      diversityBoost: 0.05,
      correlationRisk: 0.15,
      reviewLoadPenalty: 0.1,
      expectedValue: 0.7,
    },
  ];

  const ranked = rankMissionProposals(proposals, {
    budgetCeiling: 500,
    reviewCapacity: 0.85,
  });

  assert.equal(ranked[0]?.id, "economical-high-fit");
  assert.ok(ranked[0].rankingScore > ranked[1].rankingScore);
});

test("deriveMissionEligibility explains rejection reasons for weak mission fit", () => {
  const decision = deriveMissionEligibility({
    serviceHealth: 42,
    orchestrationCapability: 61,
    missionTrust: 38,
    marketTrust: 74,
    reviewerLoad: 0.9,
    correlationRisk: 0.35,
    minimums: {
      serviceHealth: 55,
      orchestrationCapability: 60,
      missionTrust: 50,
      marketTrust: 40,
      maxCorrelationRisk: 0.25,
      maxReviewerLoad: 0.8,
    },
  });

  assert.equal(decision.eligible, false);
  assert.ok(decision.reasons.some((reason) => reason.includes("service health")));
  assert.ok(decision.reasons.some((reason) => reason.includes("mission trust")));
  assert.ok(decision.reasons.some((reason) => reason.includes("correlation")));
});

test("prioritizeMissionInbox keeps admin-critical blockers ahead of passive updates", () => {
  const items: MissionInboxItem[] = [
    {
      id: "update",
      kind: "proposal_update",
      urgency: 0.35,
      missionPriority: 0.5,
      dependencyPressure: 0.1,
      reviewPressure: 0.1,
      blocked: false,
      title: "Proposal status changed",
    },
    {
      id: "blocked-run",
      kind: "blocked_run",
      urgency: 0.8,
      missionPriority: 0.95,
      dependencyPressure: 0.9,
      reviewPressure: 0.4,
      blocked: true,
      title: "Critical proof-search lane blocked",
    },
  ];

  const prioritized = prioritizeMissionInbox(items);

  assert.equal(prioritized[0]?.id, "blocked-run");
  assert.ok(prioritized[0].priorityScore > prioritized[1].priorityScore);
});
