# TokenMart Rebrand And Product Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand TokenMart around its agent-credit economy pitch and redesign the entire product into a darker, boxier, Vercel-inspired interface with explicit halftone, dither, and ASCII infrastructure motifs.

**Architecture:** Centralize the redesign through the existing shell system so global tokens, section identity, and shared chrome shift first, then sweep route-level messaging and page composition family by family. Reuse the existing ASCII and texture primitives, but redirect them from warm-editorial styling toward colder exchange-terminal surfaces and harder information hierarchy.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4, TypeScript, Geist fonts, local ASCII/halftone UI primitives.

---

## Design Direction

- Treat Vercel as an inspiration source for hierarchy, restraint, and black-first product framing, not as a literal clone.
- Replace the current warm serif/editorial system with a colder sans/mono stack, graphite surface ramp, harder borders, flatter radii, and denser operator-style layouts.
- Keep the app’s existing differentiator: explicit ASCII, halftone, and dither. Use it as infrastructure texture, trust visualization, and hero framing rather than soft decoration.
- Reframe the copy around TokenMart’s product thesis:
  - TokenHall is the exchange and routing layer for agent inference credits.
  - TokenBook is the communication and social graph for agents.
  - Trust is the anti-sybil reputation layer that unlocks coordination at scale.
  - Admin and dashboards are operator consoles for supply, bounties, reviews, wallets, and throughput.

## Verification Strategy

- Preserve and expand `src/lib/ui-shell.test.ts` so the shell routing, section identities, and nav metadata stay valid after the redesign.
- Run targeted route and shared-shell verification through `npm run lint`, `npm run typecheck`, and `npm run build`.
- Manually inspect the final site locally on the landing page, auth shell, and one representative page from Dashboard, TokenHall, TokenBook, and Admin.

## Task 1: Reframe the global design system

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/ui-shell.ts`
- Test: `src/lib/ui-shell.test.ts`

**Step 1: Write the failing test**

Add assertions that prove the redesigned shell metadata is consistent:
- section labels reflect the new product framing
- section accent ramps are updated
- shared navigation still resolves in order

**Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/lib/ui-shell.test.ts`
Expected: FAIL because the existing labels, hints, or accents still reflect the warm editorial system.

**Step 3: Write minimal implementation**

Update:
- root metadata and theme color in `src/app/layout.tsx`
- global tokens in `src/app/globals.css`
- section labels, hints, accent ramps, and surface semantics in `src/lib/ui-shell.ts`

Keep the design system centralized. Do not page-edit yet.

**Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/lib/ui-shell.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/lib/ui-shell.ts src/lib/ui-shell.test.ts
git commit -m "feat: reframe tokenmart shell design system"
```

## Task 2: Redesign shared chrome and primitives

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/breadcrumbs.tsx`
- Modify: `src/components/page-header.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/stat.tsx`
- Modify: `src/components/ui/section-header.tsx`

**Step 1: Write the failing test**

Add or extend shared-shell tests that confirm:
- auth and app sections still resolve through the shell registry
- nav sections remain populated after label changes

**Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/lib/ui-shell.test.ts`
Expected: FAIL if new section metadata is referenced but shared chrome still assumes old labels or presets.

**Step 3: Write minimal implementation**

Update shared surfaces to the new direction:
- tighter layout spacing
- harder panel edges and borders
- darker backgrounds and sharper contrast
- stronger mono/sans hierarchy
- less warm glow, more subtle graphite and white signal
- persistent halftone/dither presence across shells

**Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/lib/ui-shell.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(app)/layout.tsx src/app/(auth)/layout.tsx src/components/sidebar.tsx src/components/breadcrumbs.tsx src/components/page-header.tsx src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/badge.tsx src/components/ui/stat.tsx src/components/ui/section-header.tsx src/lib/ui-shell.test.ts
git commit -m "feat: redesign shared tokenmart chrome"
```

## Task 3: Rebuild public brand surfaces

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/docs/page.tsx`

**Step 1: Write the failing test**

Add a content-focused test that checks the landing narrative references:
- agent credit economy
- TokenHall
- TokenBook
- trust and anti-sybil framing

If route-level render testing is too expensive in the current repo, extract static copy constants and test them instead.

**Step 2: Run test to verify it fails**

Run the new targeted test command.
Expected: FAIL because the current copy still uses the old warm infrastructure language.

**Step 3: Write minimal implementation**

Rebuild:
- landing hero, product sections, trust explanation, marketplace framing, CTA structure
- docs page into a colder system page that matches the new brand shell

**Step 4: Run test to verify it passes**

Run the targeted test command plus `node --test --import tsx src/lib/ui-shell.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/docs/page.tsx
git commit -m "feat: rebrand tokenmart public surfaces"
```

## Task 4: Redesign auth and onboarding

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(auth)/claim/page.tsx`
- Modify: `src/app/(auth)/agent-register/page.tsx`

**Step 1: Write the failing test**

Add a targeted assertion strategy for auth copy or extracted copy constants covering:
- identity checkpoint language
- wallet / claim / agent onboarding framing
- trust-aware onboarding intent

**Step 2: Run test to verify it fails**

Run the targeted test command.
Expected: FAIL

**Step 3: Write minimal implementation**

Update each auth route so it reads like a controlled exchange onboarding flow instead of a generic form set.

**Step 4: Run test to verify it passes**

Run the targeted test command.
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/register/page.tsx src/app/(auth)/claim/page.tsx src/app/(auth)/agent-register/page.tsx
git commit -m "feat: redesign tokenmart auth checkpoints"
```

## Task 5: Redesign interior product families

**Files:**
- Modify: `src/app/(app)/dashboard/**/*.tsx`
- Modify: `src/app/(app)/tokenhall/**/*.tsx`
- Modify: `src/app/(app)/tokenbook/**/*.tsx`
- Modify: `src/app/(app)/admin/**/*.tsx`

**Step 1: Write the failing test**

Add tests around any extracted shared copy/config introduced for the families, plus shell metadata that those pages depend on.

**Step 2: Run test to verify it fails**

Run the targeted test command(s).
Expected: FAIL

**Step 3: Write minimal implementation**

Family-by-family:
- Dashboard: shift from generic account overview to operator cockpit for trust, credits, and active infrastructure.
- TokenHall: clarify marketplace, routing, keys, models, and spend mechanics.
- TokenBook: clarify social graph, DMs, group coordination, and profile trust surfaces.
- Admin: frame tasks, bounties, credits, and reviews as operator workflows within a credit economy.

Prefer shared copy maps and repeated layout primitives over isolated one-off phrasing.

**Step 4: Run test to verify it passes**

Run the targeted tests plus:
- `npm run lint`
- `npm run typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(app)
git commit -m "feat: redesign tokenmart product surfaces"
```

## Task 6: Full verification and polish

**Files:**
- Review all modified files

**Step 1: Run verification**

Run:
- `node --test --import tsx src/lib/ui-shell.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

**Step 2: Fix any failures**

Resolve any regressions without weakening the redesign.

**Step 3: Manual spot checks**

Inspect:
- `/`
- `/login`
- `/dashboard`
- `/tokenhall`
- `/tokenbook`
- `/admin`

Check responsive behavior, contrast, empty states, and visual consistency.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify tokenmart redesign"
```

Plan complete and saved to `docs/plans/2026-03-06-tokenmart-rebrand-and-product-redesign.md`.
