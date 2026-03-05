# Comprehensive Backend Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate critical backend correctness, race-condition, security, and scalability issues across TokenHall, TokenBook, and auth/session flows.

**Architecture:** Introduce database-enforced invariants and atomic SQL helpers first, then switch API routes/libs to RPC-first execution with compatibility fallbacks for partially migrated environments. Keep wire contracts stable while strengthening behavior under concurrency and high throughput.

**Tech Stack:** Next.js App Router, Supabase Postgres, Supabase RPC, TypeScript.

---

### Task 1: Add schema-level hardening primitives

**Files:**
- Create: `supabase/migrations/00009_comprehensive_backend_hardening.sql`

**Steps:**
1. Add `provider_keys` scope normalization + exact-one-scope constraint + partial unique indexes.
2. Add `tokenhall_api_keys.spent_credits` with backfill.
3. Add `deduct_credits_with_key_limit` RPC for atomic balance + per-key cap settlement.
4. Add `get_key_usage_stats` RPC for aggregated key usage reads.
5. Add `search_agents_safe` RPC to remove query-string filter injection risk.
6. Add `join_group_atomic` and `leave_group_atomic` RPCs for capacity-safe membership writes.

### Task 2: Refactor TokenHall billing and usage stats

**Files:**
- Modify: `src/lib/tokenhall/billing.ts`
- Create: `src/lib/tokenhall/key-usage.ts`
- Modify: `src/app/api/v1/tokenhall/key/route.ts`
- Modify: `src/app/api/v1/tokenhall/keys/[keyId]/route.ts`

**Steps:**
1. Move per-key credit-limit checks to O(1) (`credit_limit` + `spent_credits`) with legacy fallback.
2. Use `deduct_credits_with_key_limit` when key-scoped deductions are needed.
3. Switch key usage endpoints to `get_key_usage_stats` RPC with graceful fallback.

### Task 3: Harden provider-key lifecycle and lookup

**Files:**
- Modify: `src/app/api/v1/tokenhall/provider-keys/route.ts`
- Modify: `src/lib/tokenhall/router.ts`

**Steps:**
1. Remove read-then-write race in provider key create/update path.
2. Handle unique conflicts deterministically and upsert within scoped ownership.
3. Make provider key resolution deterministic (`order + limit + maybeSingle`) to avoid accidental platform-key fallback.

### Task 4: Fix auth/session and registration correctness

**Files:**
- Modify: `src/lib/auth/middleware.ts`
- Modify: `src/app/api/v1/auth/login/route.ts`
- Modify: `src/app/api/v1/auth/register/route.ts`
- Modify: `src/app/api/v1/agents/register/route.ts`
- Modify: `src/app/(auth)/claim/page.tsx`

**Steps:**
1. Remove 100-agent session ceiling by validating requested agent directly and using bounded ambiguity checks.
2. Fail login if session row insert fails.
3. Handle account/agent uniqueness races with explicit conflict mapping.
4. Align claim URL format with UI route (`/claim?code=...`) and preload claim form from query param.

### Task 5: Make group membership writes atomic

**Files:**
- Modify: `src/app/api/v1/tokenbook/groups/[groupId]/route.ts`

**Steps:**
1. Use `join_group_atomic` / `leave_group_atomic` RPC in primary path.
2. Map RPC result codes to clear API responses.
3. Keep compatibility fallback for environments missing new RPCs.

### Task 6: Finish API compatibility and final verification

**Files:**
- Modify: `src/app/api/v1/tokenhall/chat/completions/route.ts`
- Modify: `src/app/api/v1/tokenhall/messages/route.ts`
- Modify: `src/app/api/v1/tokenbook/search/route.ts`
- Modify: `src/app/(app)/tokenbook/groups/[groupId]/page.tsx` (already patched key warning)

**Steps:**
1. Return provider-compatible 429 payloads on TokenHall endpoints.
2. Route agent search through safe RPC (fallback if missing).
3. Keep existing GroupDetail key fix and ensure typing consistency.
4. Run `npm run typecheck`, summarize remaining lint state, and report all changes.
