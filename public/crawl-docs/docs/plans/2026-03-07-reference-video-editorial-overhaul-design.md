# Reference Video Editorial Overhaul Design

**Date:** 2026-03-07

**Objective:** Replace TokenMart's current black Vercel-like visual system with a white, pink, editorial-tech identity derived from the approved reference video, and apply it across the landing page, authenticated shell, auth flow, docs, and major app surfaces.

## Reference Read

The approved reference is not a generic pastel redesign. Its recurring visual language is:

- paper-white stages with aggressive hot-pink interruption
- grayscale or desaturated imagery used as structural composition
- thin diagram grids, barcode/index markings, and technical labels
- hard rectangular framing instead of soft floating glass cards
- selective glitch corruption used as emphasis, transition, and texture
- bold condensed display moments paired with cleaner functional UI typography
- layouts that feel like a product interface designed by an editorial art director

The implementation should transfer that language into a usable product, not clone literal frames or content.

## Product Strategy

This redesign follows an **editorial shell + functional product core** approach:

- Public surfaces adopt the reference most aggressively.
- Shared product shell and headers carry the new identity strongly.
- Dense operational surfaces keep scanability, but still inherit the same palette, typography, borders, spacing, and framing.
- Glitch effects remain purposeful and intermittent so loaded screens stay legible.

## Visual System

### Color

- Base canvas: warm paper white
- Primary accent: hot pink / vivid magenta
- Secondary accent: soft blush pink
- Ink: near-black charcoal
- Utility tones: cool gray, pale rose, and white
- Success/warning/danger move away from neon dark-mode conventions and sit naturally inside the lighter editorial system

### Typography

- Replace Geist-led identity with a more expressive editorial stack
- Use a bold condensed display face for page titles, hero moments, and oversized numeric callouts
- Use a cleaner sans for dense UI labels, body text, forms, and navigation
- Keep mono only for metadata, barcodes, IDs, and system labels

### Shape And Composition

- Mostly rectangular panels with restrained radii
- Thin border lines, crop marks, corner rules, and technical dividers
- Split compositions with image planes, label strips, and offset blocks
- Strong index numerals and catalog-like metadata

### Motion And Texture

- Short reveal/fade/slide motions with occasional glitch masking on section arrivals
- Reduced-motion safe fallbacks for every decorative animation
- Grain, diagram lines, scan noise, and glitch slices replace current dither/pixel/aurora language

## System Architecture

### Shared Design System

Centralize the overhaul in:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/lib/ui-shell.ts`
- `src/components/ui/*`

This layer becomes the source of truth for:

- palette tokens
- fonts
- border/shadow/radius rules
- shell section accents
- utility classes for barcode labels, diagram grids, split panels, glitch bands, and photographic surfaces

### Shared Shell

Rebuild:

- authenticated shell
- sidebar
- breadcrumbs
- page headers
- command palette
- logo / wordmark treatment

The shell should feel like an editorial operating environment rather than a dark admin chrome.

### Route Families

- Landing: fully bespoke and reference-forward
- Auth: lighter, poster-like checkpoint layouts
- Docs: converted from dark cards into structured editorial documentation
- Dashboard / TokenHall / TokenBook / Admin: rebuilt on the new primitives, with custom treatment for major outliers

## Route Intent

### Landing

- Treat as the most explicit translation of the reference
- Use large typographic blocks, grayscale visual planes, pink field interruptions, and product-system diagrams
- Keep clear CTAs and product explanation

### Auth

- Turn forms into identity checkpoints and registration dossiers
- White space, thin rules, and technical labels should do the work instead of dark panels

### Docs

- Recast docs into a publication-style system with navigable catalog pages, clean reading columns, and structured callout modules

### Product Interior

- Preserve throughput for tables, cards, feed items, messaging, and filters
- Introduce the editorial identity through layout framing, hierarchy, palette, and metadata components instead of making every screen decorative

## Verification

Before completion:

- inspect public landing, docs, auth, dashboard, TokenHall, TokenBook, and at least one detail screen in-browser
- run `npm run lint`
- run `npm run typecheck`
- run `npm run build`
- fix any obvious responsive, contrast, or overflow regressions found during browser review

## Scope Notes

- Existing unrelated worktree changes are preserved.
- The redesign prioritizes shared primitives first so the visual change lands app-wide.
- Route-level custom work will focus on the highest-impact outliers after the shared system is in place.
