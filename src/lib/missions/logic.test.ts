import assert from "node:assert/strict";
import test from "node:test";

import {
  computeProposalScore,
  deriveMissionEligibility,
  getNextTrancheAction,
} from "./logic";

test("computeProposalScore rewards fit, efficiency, diversity, and verification planning", () => {
  const strong = computeProposalScore({
    requestedCredits: 120,
    budgetCap: 200,
    confidence: 0.82,
    fitScore: 0.91,
    priorVerifiedScore: 0.77,
    diversityScore: 0.8,
    correlationRisk: 0.1,
    verificationReadiness: 0.9,
    expectedValue: 0.88,
  });

  const weak = computeProposalScore({
    requestedCredits: 195,
    budgetCap: 200,
    confidence: 0.48,
    fitScore: 0.45,
    priorVerifiedScore: 0.35,
    diversityScore: 0.2,
    correlationRisk: 0.8,
    verificationReadiness: 0.25,
    expectedValue: 0.42,
  });

  assert.equal(strong.status, "competitive");
  assert.equal(weak.status, "weak");
  assert.ok(strong.score > weak.score);
  assert.ok(
    strong.reasons.some((reason) => reason.includes("fit")),
    "expected strong proposal to explain fit-based ranking",
  );
  assert.ok(
    weak.reasons.some((reason) => reason.includes("correlation")),
    "expected weak proposal to explain correlation penalty",
  );
});

test("deriveMissionEligibility blocks frozen lanes and weak mission trust", () => {
  const blocked = deriveMissionEligibility({
    laneFrozen: true,
    missionTrustScore: 0.39,
    orchestrationScore: 0.73,
    serviceHealthScore: 0.81,
    requiredMissionTrust: 0.55,
    requiredOrchestration: 0.6,
    requiredServiceHealth: 0.6,
  });

  assert.equal(blocked.eligible, false);
  assert.ok(blocked.reasons.some((reason) => reason.includes("frozen")));
  assert.ok(blocked.reasons.some((reason) => reason.includes("mission trust")));

  const allowed = deriveMissionEligibility({
    laneFrozen: false,
    missionTrustScore: 0.72,
    orchestrationScore: 0.84,
    serviceHealthScore: 0.88,
    requiredMissionTrust: 0.55,
    requiredOrchestration: 0.6,
    requiredServiceHealth: 0.6,
  });

  assert.equal(allowed.eligible, true);
  assert.ok(allowed.reasons.some((reason) => reason.includes("eligible")));
});

test("getNextTrancheAction enforces staged treasury release", () => {
  const awaitingReview = getNextTrancheAction({
    trancheKind: "execution",
    releasedAmount: 200,
    spentAmount: 160,
    reservedAmount: 40,
    reviewStatus: "waiting_for_review",
    emergencyFreeze: false,
  });

  assert.equal(awaitingReview.action, "hold");
  assert.ok(awaitingReview.reason.includes("review"));

  const releasable = getNextTrancheAction({
    trancheKind: "verification",
    releasedAmount: 100,
    spentAmount: 75,
    reservedAmount: 0,
    reviewStatus: "verified",
    emergencyFreeze: false,
  });

  assert.equal(releasable.action, "release_next");
  assert.ok(releasable.reason.includes("verified"));

  const frozen = getNextTrancheAction({
    trancheKind: "planning",
    releasedAmount: 50,
    spentAmount: 10,
    reservedAmount: 0,
    reviewStatus: "active",
    emergencyFreeze: true,
  });

  assert.equal(frozen.action, "freeze");
  assert.ok(frozen.reason.includes("freeze"));
});
