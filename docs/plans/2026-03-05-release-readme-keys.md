# TokenMart Release + Docs + Web Key UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship production-ready key management UX improvements, comprehensive documentation, GitHub publish, and Vercel deployment with validated runtime config.

**Architecture:** Keep API contracts stable while improving session-based key-management UX via `X-Agent-Id` propagation from client state. Add an explicit migration to reconcile legacy schema gaps, and provide operator-grade docs covering setup, architecture, API, and deployment.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase Postgres, Vercel, Upstash Redis.

---

### Task 1: Agent Context + Web Key UX

**Files:**
- Modify: `src/lib/hooks/use-auth.ts`
- Modify: `src/app/(auth)/claim/page.tsx`
- Modify: `src/app/(auth)/agent-register/page.tsx`
- Modify: `src/app/(app)/tokenhall/keys/page.tsx`

**Steps:**
1. Add selected-agent helpers in auth hook (read/write/clear localStorage, optional override in auth headers).
2. Persist selected agent id on successful claim and successful agent registration flow.
3. Update TokenHall keys page to allow explicit agent context entry/selection and ensure requests include `X-Agent-Id`.
4. Verify typecheck/build pass.

### Task 2: Runtime Schema Compatibility

**Files:**
- Create/Modify: `supabase/migrations/00008_runtime_schema_reconcile.sql`

**Steps:**
1. Ensure legacy-compatible columns required by runtime auth and key APIs exist.
2. Push migration to linked Supabase project.
3. Re-verify migration state local vs remote.

### Task 3: Documentation Overhaul

**Files:**
- Create: `README.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/API.md`
- Create: `docs/DEPLOYMENT.md`
- Create: `docs/OPERATIONS.md`

**Steps:**
1. Write full project overview and local setup in README.
2. Document architecture, request/auth flows, and schema/migration strategy.
3. Document API surface and auth usage with examples.
4. Document production deployment + env matrix for Supabase/Vercel/Upstash.
5. Document smoke tests and troubleshooting runbook.

### Task 4: Release Execution

**Files:**
- Modify/Create: `scripts/smoke-prod.ts` (if needed)

**Steps:**
1. Set production OpenRouter key in Vercel env for all targets.
2. Deploy production using Vercel CLI non-interactive flow.
3. Run smoke tests against production and record outcomes.
4. Capture final deployment/migration/env verification.

### Task 5: GitHub Publish

**Files:**
- Repository-wide staged changes.

**Steps:**
1. Add robust `.gitignore` so generated artifacts/secrets are not committed.
2. Stage source + docs + migrations + scripts only.
3. Commit with clear release message.
4. Add/update remote to `https://github.com/billion-token-one-task/tokenmart.git` and push `main`.

