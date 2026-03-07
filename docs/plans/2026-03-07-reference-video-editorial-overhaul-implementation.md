# Reference Video Editorial Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild TokenMart's full visual identity around the approved white-and-pink editorial reference video and apply it across shared primitives, shell chrome, landing, docs, auth, and major app surfaces.

**Architecture:** Establish a new light-first token system and shared component layer first, then restyle the shell so the majority of app pages inherit the overhaul automatically. After that, rebuild custom outliers like the landing page, docs system, auth pages, dashboard, and the main TokenHall/TokenBook surfaces so the identity is coherent end-to-end.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4, TypeScript, Next font loading, Playwright browser inspection, local shared UI primitives.

---

### Task 1: Install the new design system spine

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/ui-shell.ts`
- Test: `src/lib/ui-shell.test.ts`

**Step 1: Write the failing test**

Add assertions that verify the shell metadata matches the new visual system:

- section labels and accents resolve correctly
- light-first theme defaults do not break route resolution
- the navigation registry still resolves the same app families

**Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/lib/ui-shell.test.ts`
Expected: FAIL because existing theme metadata is still dark and old-brand oriented.

**Step 3: Write minimal implementation**

Update:

- root font and metadata bootstrapping
- global tokens and utility classes
- shell registry color ramps and labels

**Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/lib/ui-shell.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/lib/ui-shell.ts src/lib/ui-shell.test.ts
git commit -m "feat: install editorial design system spine"
```

### Task 2: Rebuild shared shell and shared primitives

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/breadcrumbs.tsx`
- Modify: `src/components/page-header.tsx`
- Modify: `src/components/command-palette.tsx`
- Modify: `src/components/logo.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/tabs.tsx`
- Modify: `src/components/ui/modal.tsx`
- Modify: `src/components/ui/table.tsx`
- Modify: `src/components/ui/stat.tsx`
- Modify: `src/components/ui/section-header.tsx`
- Modify: `src/components/ui/toast.tsx`

**Step 1: Write the failing test**

Extend shared-shell coverage so the nav and section metadata remain valid after the chrome rewrite.

**Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/lib/ui-shell.test.ts`
Expected: FAIL if the new metadata and shell assumptions diverge.

**Step 3: Write minimal implementation**

Replace the current dark glass/pixel UI with:

- white editorial shell framing
- pink accent and barcode metadata treatment
- technical dividers and diagram grids
- lighter cards, tables, tabs, forms, and toasts

**Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/lib/ui-shell.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(app)/layout.tsx src/app/(auth)/layout.tsx src/components/sidebar.tsx src/components/breadcrumbs.tsx src/components/page-header.tsx src/components/command-palette.tsx src/components/logo.tsx src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/input.tsx src/components/ui/select.tsx src/components/ui/badge.tsx src/components/ui/tabs.tsx src/components/ui/modal.tsx src/components/ui/table.tsx src/components/ui/stat.tsx src/components/ui/section-header.tsx src/components/ui/toast.tsx
git commit -m "feat: rebuild editorial shell and primitives"
```

### Task 3: Rebuild the public brand surfaces

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/docs/layout.tsx`
- Modify: `src/app/docs/page.tsx`
- Modify: `src/components/docs/docs-sidebar.tsx`
- Modify: `src/components/docs/docs-ui.tsx`

**Step 1: Write the failing test**

Add a content-focused test or extract content constants so the new public framing can be verified independently.

**Step 2: Run test to verify it fails**

Run the targeted test command.
Expected: FAIL because the old dark/public system is still present.

**Step 3: Write minimal implementation**

Rebuild the landing and docs surfaces using the editorial system, split panels, index numerals, technical labels, and white/pink brand language.

**Step 4: Run test to verify it passes**

Run the targeted test command.
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/docs/layout.tsx src/app/docs/page.tsx src/components/docs/docs-sidebar.tsx src/components/docs/docs-ui.tsx
git commit -m "feat: rebuild public editorial surfaces"
```

### Task 4: Rebuild auth and major app outliers

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(auth)/claim/page.tsx`
- Modify: `src/app/(auth)/agent-register/page.tsx`
- Modify: `src/app/(auth)/auth-ui.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/(app)/tokenhall/page.tsx`
- Modify: `src/app/(app)/tokenbook/page.tsx`
- Modify: `src/app/(app)/tokenbook/conversations/[conversationId]/page.tsx`

**Step 1: Write the failing test**

Add or extend any extracted content/config tests needed by the new app-family framing.

**Step 2: Run test to verify it fails**

Run the targeted test command(s).
Expected: FAIL

**Step 3: Write minimal implementation**

Apply the new editorial system to auth and the major route outliers that do not fully inherit the primitive pass.

**Step 4: Run test to verify it passes**

Run the targeted test command(s).
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/register/page.tsx src/app/(auth)/claim/page.tsx src/app/(auth)/agent-register/page.tsx src/app/(auth)/auth-ui.tsx src/app/(app)/dashboard/page.tsx src/app/(app)/tokenhall/page.tsx src/app/(app)/tokenbook/page.tsx src/app/(app)/tokenbook/conversations/[conversationId]/page.tsx
git commit -m "feat: reframe auth and major app surfaces"
```

### Task 5: Verify the full overhaul

**Files:**
- Modify: any touched files needed to resolve regressions from checks

**Step 1: Run tests and checks**

Run:

- `node --test --import tsx src/lib/ui-shell.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

**Step 2: Run manual browser verification**

Inspect locally:

- `/`
- `/docs`
- `/login`
- one representative authenticated route from dashboard, TokenHall, TokenBook, and admin

**Step 3: Fix issues**

Address any contrast, overflow, or route-specific regressions found during verification.

**Step 4: Re-run checks**

Run the same verification commands again.
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "fix: stabilize editorial overhaul"
```
