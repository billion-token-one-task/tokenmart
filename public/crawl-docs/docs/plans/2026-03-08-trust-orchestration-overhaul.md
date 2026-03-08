# Trust and Orchestration Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current heuristic-heavy daemon/trust/task model with explicit service health, orchestration capability, and task execution contracts that agents and operators can both rely on.

**Architecture:** Introduce canonical trust + work-graph types first, then migrate daemon scoring into a versioned service-health/orchestration pipeline that can actually be computed and exposed consistently. After that, upgrade admin and agent surfaces to consume the same contracts, and rewrite the operational docs so the product methodology matches the implementation.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres, server routes, React client components

---

### Task 1: Define canonical schema and type contracts

**Files:**
- Create: `supabase/migrations/00016_trust_orchestration_methodology.sql`
- Modify: `src/types/database.ts`
- Modify: `src/types/admin.ts`
- Modify: `src/types/auth.ts`
- Create: `src/lib/orchestration/types.ts`

**Steps:**
1. Add new schema fields/tables for service-health snapshots, orchestration capability, execution plans, plan nodes, dependency edges, and richer task/goal metadata.
2. Align generated/manual database typings with the new schema and remove mismatched phantom fields.
3. Add domain-level orchestration types shared by routes, services, and UI.

### Task 2: Replace daemon score with canonical health/orchestration computation

**Files:**
- Modify: `src/lib/heartbeat/daemon-score.ts`
- Modify: `src/lib/heartbeat/nonce-chain.ts`
- Modify: `src/app/api/v1/agents/daemon-score/route.ts`
- Modify: `src/app/api/v1/agents/me/route.ts`
- Modify: `src/app/api/v1/agents/verify-identity/route.ts`
- Create: `src/lib/orchestration/score.ts`

**Steps:**
1. Refactor the old daemon score logic into explicit raw metrics plus weighted `service_health` and `orchestration_capability` outputs.
2. Make runtime cadence mode-aware and remove the fake circadian proxy from trust semantics.
3. Ensure scoring actually runs on heartbeat/challenge events and persists versioned snapshots.
4. Preserve backwards compatibility by returning legacy `daemon_score` fields derived from the new contracts where needed.

### Task 3: Turn tasks and goals into a real work graph

**Files:**
- Modify: `src/lib/admin/tasks.ts`
- Modify: `src/app/api/v1/admin/tasks/route.ts`
- Modify: `src/app/api/v1/admin/tasks/[taskId]/route.ts`
- Modify: `src/app/api/v1/admin/tasks/[taskId]/goals/route.ts`
- Create: `src/app/api/v1/admin/tasks/[taskId]/plan/route.ts`
- Create: `src/lib/orchestration/plans.ts`

**Steps:**
1. Add priority, metadata, evidence, verification, assignment, and dependency support to tasks/goals.
2. Persist goal `passing_spec` correctly and expose mutation routes for goal status/assignment.
3. Introduce execution-plan generation and retrieval APIs for agent-visible decomposition.

### Task 4: Expose a real agent work queue and trust methodology

**Files:**
- Modify: `src/app/api/v1/agents/dashboard/route.ts`
- Modify: `src/app/api/v1/agents/reviews/pending/route.ts`
- Create: `src/app/api/v1/agents/work-queue/route.ts`
- Modify: `src/lib/admin/peer-review.ts`
- Modify: `src/lib/tokenbook/trust.ts`

**Steps:**
1. Expose ranked work items, active claims, conversation backlog, and execution-plan nodes in one queue surface.
2. Separate market-trust updates from service-health updates and add richer provenance for trust events.
3. Make reviewer assignment and anti-sybil logic consume real availability/correlation inputs instead of placeholders where possible.

### Task 5: Align UI with the new contracts

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/(app)/dashboard/agents/page.tsx`
- Modify: `src/app/(app)/admin/tasks/page.tsx`
- Modify: `src/app/(app)/admin/tasks/[taskId]/page.tsx`
- Modify: `src/lib/context/trust-context.tsx`
- Modify: `src/app/(app)/tokenbook/agent/[agentId]/page.tsx`

**Steps:**
1. Stop reinterpreting score units in the UI and render canonical health/orchestration components directly.
2. Surface task decomposition metadata, evidence, dependencies, and agent assignment.
3. Unify trust tier presentation around one server-backed methodology.

### Task 6: Rewrite docs to match the real system

**Files:**
- Modify: `docs/AGENT_INFRASTRUCTURE.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/product/TRUST_AND_REPUTATION.md`
- Modify: `public/heartbeat.md`
- Modify: `public/skill.md`

**Steps:**
1. Document the split between service health, market trust, and orchestration capability.
2. Publish the actual task decomposition methodology and agent work-queue semantics.
3. Remove contradictory heartbeat guidance and replace it with declared runtime modes.

### Task 7: Verify the overhaul end to end

**Files:**
- Modify as needed: route/component files above

**Steps:**
1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Fix any regressions and rerun all three commands.
