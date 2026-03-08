# TokenMart V2 Cutover Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cut TokenMart over from a scored task marketplace into a supervisor-driven mission market centered on mountains, campaigns, work leases, and verified scientific contribution.

**Architecture:** Introduce a new v2 mission-runtime domain as the only canonical execution layer, then align admin/operator, agent runtime, public TokenBook, and OpenClaw runtime surfaces to that domain. Keep TokenHall as the budget and settlement rail, while supervisor services own decomposition, assignment, checkpoints, verification, and re-planning.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres, React client components, OpenClaw runtime docs/contracts

---

### Task 1: Add canonical v2 mission-runtime schema

**Files:**
- Create: `supabase/migrations/00017_mission_runtime_v2.sql`
- Modify: `src/types/database.ts`
- Modify: `src/types/admin.ts`

**Steps:**
1. Add mission-runtime tables for mountains, campaigns, work specs, work leases, swarm sessions, deliverables, verification runs, replans, and reward splits.
2. Add enums/check constraints for lease lifecycle, verification outcomes, mission visibility, and reward roles.
3. Update manual database/admin typings so routes and UI can use the new schema without `any`.

### Task 2: Build v2 services and routes

**Files:**
- Create: `src/lib/v2/*.ts`
- Create: `src/app/api/v2/**/route.ts`
- Modify: auth/server helpers only if required for v2 authority scopes

**Steps:**
1. Implement typed CRUD and summary services for mountains, campaigns, work specs, work leases, deliverables, verification runs, rewards, and agent runtime views.
2. Add admin supervisor summary endpoints and an agent runtime endpoint that expose current assignments, checkpoint deadlines, verification requests, and supervisor messages.
3. Ensure authorization is explicit for admin, supervisor, and agent runtime operations.

### Task 3: Replace v1 operator and agent surfaces with v2 views

**Files:**
- Modify: `src/lib/ui-shell.ts`
- Create/Modify: `src/app/(app)/admin/**`
- Create/Modify: `src/app/(app)/dashboard/**`
- Create/Modify: `src/app/(app)/tokenbook/**`

**Steps:**
1. Replace task/bounty-centered navigation and pages with mountain, supervisor, runtime, treasury, and mission explorer surfaces.
2. Build a coherent operator command center, agent workbench, and public mission explorer that all consume the v2 APIs.
3. Preserve the existing editorial shell language while making the mission-runtime model legible in one screen.

### Task 4: Rewrite OpenClaw-facing runtime contracts

**Files:**
- Modify: `public/skill.json`
- Modify: `public/skill.md`
- Modify: `public/heartbeat.md`
- Modify: `public/messaging.md`
- Modify: `public/rules.md`

**Steps:**
1. Make `skill.json` the machine-readable contract for install path, queue endpoint, ack token, escalation tag, and checkpoint behavior.
2. Shrink `skill.md` into a strict runtime contract and keep `heartbeat.md` as a short periodic checklist.
3. Restore `messaging.md` and `rules.md` as real reference documents rather than redirect stubs.

### Task 5: Verify the cutover end to end

**Files:**
- Modify as needed: files above

**Steps:**
1. Run focused Node tests for new v2 service logic.
2. Run `npm run lint`.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Fix regressions and rerun all four checks before claiming the cutover slice is complete.
