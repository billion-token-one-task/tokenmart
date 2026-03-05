# TokenHall Prod Streaming + OpenRouter Model Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify production TokenHall API compatibility and streaming behavior against OpenRouter-style expectations, then populate the model registry with the most popular OpenRouter models for March 2026 using correct slugs.

**Architecture:** Add a dedicated production verification script that authenticates, provisions scoped test keys, executes non-stream + stream checks, validates response schema and SSE framing, and revokes temporary keys. Add a repeatable model-sync script that pulls OpenRouter model metadata and upserts a curated most-popular set into the `models` table using canonical slugs and provider capabilities.

**Tech Stack:** Next.js API routes, Supabase Postgres (service role), OpenRouter Chat Completions API, TypeScript + tsx scripts, Node fetch + SSE parsing.

---

### Task 1: Add deterministic production API verification script

**Files:**
- Create: `scripts/verify-tokenhall-prod.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

Create a script entrypoint and call it before implementation details exist.

```ts
throw new Error("not implemented");
```

**Step 2: Run test to verify it fails**

Run: `npx tsx scripts/verify-tokenhall-prod.ts`
Expected: FAIL with implementation placeholder error.

**Step 3: Write minimal implementation**

Implement end-to-end checks:
- Login via `/api/v1/auth/login`
- Resolve/ensure claimed agent context
- Create management + inference keys
- Validate `/api/v1/tokenhall/models` and `/api/v1/tokenhall/key`
- Execute `/api/v1/tokenhall/chat/completions` non-stream and stream mode
- Parse SSE chunks and verify `data: [DONE]`
- Revoke temporary keys

**Step 4: Run test to verify it passes**

Run: `npx tsx scripts/verify-tokenhall-prod.ts`
Expected: PASS summary with all checks green.

**Step 5: Commit**

```bash
git add scripts/verify-tokenhall-prod.ts package.json
git commit -m "feat: add production tokenhall streaming verification script"
```

### Task 2: Add OpenRouter popular-model synchronization

**Files:**
- Create: `scripts/sync-openrouter-popular-models.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

Invoke the script before implementation.

```ts
throw new Error("not implemented");
```

**Step 2: Run test to verify it fails**

Run: `npx tsx scripts/sync-openrouter-popular-models.ts --dry-run`
Expected: FAIL with placeholder error.

**Step 3: Write minimal implementation**

Implement:
- Fetch OpenRouter model catalog and popularity ranking source
- Select top March 2026 popular models
- Validate slug format and metadata availability
- Upsert rows into `models` table with pricing/capabilities/metadata

**Step 4: Run test to verify it passes**

Run: `npx tsx scripts/sync-openrouter-popular-models.ts --apply`
Expected: PASS summary with inserted/updated row counts.

**Step 5: Commit**

```bash
git add scripts/sync-openrouter-popular-models.ts package.json
git commit -m "feat: sync popular openrouter models into registry"
```

### Task 3: Validate docs + compatibility guarantees

**Files:**
- Modify: `docs/API.md`

**Step 1: Write the failing test**

Search for missing streaming contract details.

```bash
rg -n "\[DONE\]|chat.completion.chunk|Anthropic SSE" docs/API.md
```

**Step 2: Run test to verify it fails**

Expected: Missing or incomplete references.

**Step 3: Write minimal implementation**

Document:
- OpenAI-compatible non-stream schema
- SSE stream framing and completion semantics
- Anthropic `/messages` event mapping
- Verification script usage

**Step 4: Run test to verify it passes**

Run: `rg -n "\[DONE\]|chat.completion.chunk|Anthropic SSE|verify-tokenhall-prod" docs/API.md`
Expected: PASS with references present.

**Step 5: Commit**

```bash
git add docs/API.md
git commit -m "docs: specify tokenhall streaming compatibility contract"
```
