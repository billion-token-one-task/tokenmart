# Orchestration Audit Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fully align TokenMart’s backend, APIs, docs, and frontend with the split trust model and the new work-graph/planner-reviewer-reconciler methodology.

**Architecture:** Audit every app surface that still assumes a single daemon score or a shallow task tree, then normalize shared contracts first, repair downstream consumers second, and finish with a deliberate UX polish and verification pass. The implementation should keep the current TokenMart visual language while making the orchestration surfaces calmer, denser, and more legible.

**Tech Stack:** Next.js 16 app router, TypeScript, Supabase, Tailwind-style utility CSS, internal UI primitives.

---

### Task 1: Complete the audit inventory

**Files:**
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/docs/plans/2026-03-08-orchestration-audit-remediation.md`
- Inspect: `/Users/kevinlin/Downloads/TokenMartCC/src/**/*`
- Inspect: `/Users/kevinlin/Downloads/TokenMartCC/docs/**/*`
- Inspect: `/Users/kevinlin/Downloads/TokenMartCC/public/**/*`

**Steps:**
1. Enumerate every remaining legacy trust/daemon/task-tree assumption across backend, API, frontend, and docs.
2. Group findings by shared contract, consumer surface, and UX inconsistency.
3. Convert the grouped findings into the concrete task list below as implementation progresses.

### Task 2: Normalize backend and API contracts

**Files:**
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/src/lib/**/*`
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/src/app/api/**/*`
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/src/types/**/*`

**Steps:**
1. Ensure every trust/daemon API exposes canonical `service_health`, `market_trust`, and `orchestration_capability` data.
2. Ensure every work-graph API exposes inputs, outputs, evidence, verification, retry, time estimates, dependencies, and review loop data.
3. Remove or demote legacy-only fields where they still shape UI decisions incorrectly.

### Task 3: Repair dependent product surfaces

**Files:**
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/src/app/(app)/**/*`

**Steps:**
1. Update remaining admin, dashboard, tokenbook, and bounty surfaces to consume the canonical model.
2. Ensure ranked work queue, plan review states, and graph metadata appear where users expect them.
3. Resolve remaining copy/spec drift so the UI no longer implies a methodology the system does not implement.

### Task 4: Polish the orchestration UX

**Files:**
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/src/app/(app)/dashboard/page.tsx`
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/src/app/(app)/dashboard/agents/page.tsx`
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/src/app/(app)/admin/tasks/page.tsx`
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/src/app/(app)/admin/tasks/[taskId]/page.tsx`
- Modify: adjacent shared UI files if needed

**Steps:**
1. Tighten layout density, hierarchy, spacing, and responsiveness for the new orchestration surfaces.
2. Improve scanability and action affordance without breaking the product’s existing artistic direction.
3. Verify loading, empty, error, mobile, and long-content states.

### Task 5: Bring docs and runtime guidance into sync

**Files:**
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/docs/**/*`
- Modify: `/Users/kevinlin/Downloads/TokenMartCC/public/**/*`

**Steps:**
1. Update docs that still imply legacy daemon-score logic or shallow task methodology.
2. Link the plain-English orchestration methodology into the broader architecture and operator docs.
3. Regenerate any derived crawl-doc outputs through the normal build flow.

### Task 6: Verify end to end

**Files:**
- No file ownership; repo-wide verification

**Steps:**
1. Run `npm run typecheck`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Run targeted UI spot checks for the new orchestration surfaces.
5. Report residual gaps honestly if any remain.
