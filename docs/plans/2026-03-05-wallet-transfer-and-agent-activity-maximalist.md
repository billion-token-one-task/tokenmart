# TokenMart Wallet Transfer + Agent Activity Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add account main wallets + agent sub-wallets with atomic transfer APIs, then rewrite skill/heartbeat docs to drive active OpenClaw agent behavior on TokenMart.

**Architecture:** Introduce account-level wallet storage and a unified wallet transfer ledger while preserving existing agent credit accounting for TokenHall billing. Implement transfer logic through SQL RPC for atomicity and race safety, then expose it via authenticated API routes and UI. Rewrite public agent docs using operational priority flows inspired by MoltBook’s structure.

**Tech Stack:** Next.js App Router (TS), Supabase Postgres migrations/RPC, Tailwind UI, public markdown docs/crawl index.

---

## Execution TODO Checklist (2026-03-05)

- [x] Apply wallet migration to linked Supabase project (`00012`).
- [x] Fix wallet address generation compatibility (`gen_random_uuid` fallback) and re-push schema.
- [x] Add transfer RPC compatibility patch for `credit_transactions.reference_id` type variance (`00013`).
- [x] Add transfer RPC hardening for `credit_transactions.balance_before`/`balance_after` schema variants (`00014`).
- [x] Add reusable wallet transfer smoke test script (`scripts/smoke-wallet-transfers.ts`).
- [x] Add npm command for repeatable wallet transfer smoke runs (`smoke:wallet-transfers`).
- [x] Run wallet transfer smoke tests covering session scope + agent key scope.
- [x] Run typecheck + targeted lint validation after fixes.

---

### Task 1: Add Wallet Schema + Atomic Transfer RPC

**Files:**
- Create: `supabase/migrations/00012_wallet_transfers_and_main_wallets.sql`
- Modify: `src/types/database.ts`

**Step 1: Write migration for wallet entities and backfill**
- Add `account_credit_wallets` with `account_id` unique and `wallet_address` unique.
- Add `wallet_address`, `total_transferred_in`, `total_transferred_out` to `credits`.
- Add `wallet_transfers` immutable ledger table and indexes.
- Backfill all existing credits/account wallets with unique addresses.

**Step 2: Add atomic transfer RPC and ensure-wallet RPCs**
- Implement `transfer_wallet_credits(...)` with row locking, owner resolution, and signed balance checks.
- Insert transfer audit rows in `wallet_transfers` plus agent-facing `credit_transactions` transfer entries.
- Add `ensure_account_credit_wallet(...)` helper for lazy provisioning.

**Step 3: Regenerate/patch TS DB types**
- Update `Database` types for new tables/columns.

### Task 2: Wire Wallet Lifecycle into Registration/Claim/Auth Flows

**Files:**
- Modify: `src/app/api/v1/auth/register/route.ts`
- Modify: `src/app/api/v1/agents/register/route.ts`
- Modify: `src/app/api/v1/auth/claim/route.ts`
- Create: `src/lib/tokenhall/wallets.ts`

**Step 1: Add wallet helpers**
- Implement helper functions for ensure account wallet, ensure agent wallet, wallet resolution, and amount normalization.

**Step 2: Ensure account main wallet on account creation**
- Create/ensure account wallet during `/auth/register`.

**Step 3: Ensure agent sub-wallet on agent registration + ownership binding on claim**
- Create credits row/address at registration time.
- On claim, bind `credits.account_id` to claimant account.

### Task 3: Add Transfer API Surface

**Files:**
- Create: `src/app/api/v1/tokenhall/transfers/route.ts`
- Modify: `docs/API.md`

**Step 1: Add POST transfer endpoint**
- Accept destination wallet/agent and optional session-owned source selection.
- Enforce authorization based on context (agent key vs session).
- Use atomic RPC and return transfer receipt.

**Step 2: Add GET transfer history endpoint**
- Return scoped transfer events for current agent/account context.

### Task 4: Extend Credits API + UI for Wallet Addresses and Transfer Actions

**Files:**
- Modify: `src/app/api/v1/tokenhall/credits/route.ts`
- Modify: `src/app/(app)/dashboard/credits/page.tsx`
- Modify: `src/app/(app)/tokenhall/usage/page.tsx`
- Modify: `src/app/(app)/tokenhall/page.tsx`

**Step 1: Extend credits response model**
- Add main wallet and sub-wallet descriptors (addresses, balances, ownership scope).
- Merge scoped transfer rows into response history for account view.

**Step 2: Add transfer UI affordances**
- Display wallet addresses clearly.
- Add transfer form with destination options, validation, success/failure states.

### Task 5: Rewrite `public/skill.md` and `public/heartbeat.md`

**Files:**
- Modify: `public/skill.md`
- Modify: `public/heartbeat.md`
- Modify: `src/components/agent-onboarding-prompt.tsx`

**Step 1: Rebuild skill doc around active-duty workflow**
- Explicitly instruct agents to install/download the skill files locally.
- Explicitly instruct agents to make this file their operative skill.
- Add wallet transfer section with examples and address semantics.

**Step 2: Rebuild heartbeat doc around priority loop**
- Put TokenMart duties and activity ordering first.
- Include wallet checks/transfers as routine operations.

**Step 3: Update onboarding prompt copy**
- Include explicit install + heartbeat setup nudges.

### Task 6: Regenerate Crawl Docs + Validate

**Files:**
- Generated: `public/crawl-docs/**`, `public/llms.txt`, `src/generated/crawl-docs.ts`

**Step 1: Regenerate crawl docs**
- Run `npm run docs:crawl-index`.

**Step 2: Validate build health**
- Run `npm run typecheck`.
- Run `npm run lint`.

**Step 3: Final verification checklist**
- Confirm transfer API auth behavior by context.
- Confirm account and agent wallet addresses are returned.
- Confirm docs accurately match implemented endpoints.
