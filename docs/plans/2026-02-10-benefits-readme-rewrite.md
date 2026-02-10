# Benefits README Rewrite Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite `src/components/marketing/benefits/README.md` to close all 24 gaps (11 wrong/outdated + 13 missing).

**Architecture:** Single-file documentation rewrite. Parallel agents verify source code claims, then merge into final README.

**Tech Stack:** Markdown documentation, no code changes.

---

### Task 1: Parallel Research & Verification

Dispatch 3 parallel agents to extract verified facts from source code:

**Agent A — Layout & Structure:**
- BenefitsSection.tsx: section wrapper classes, grid layout, viewport height, isolate, background components
- page.tsx: position in page flow, import path
- SectionBackground: DiagonalStripes + DottedPattern props

**Agent B — Component Details:**
- BenefitsBadge.tsx: SectionBadge delegation, actual rendering
- BenefitsTitle.tsx: actual heading text, actual CSS classes (text-narrative, not font-mono)
- BenefitsAccordion.tsx: actual behavior (no click-outside), client directive, accordion type/props, mobile styling
- Confirm which components are "use client" vs server

**Agent C — Styling & Dependencies:**
- BentoBenefitsGrid.tsx: actual CSS classes used (NOT bento tokens)
- DocsCTA.tsx: SectionCTA delegation (NOT btn-brand)
- globals.css: --section-bg-alt values (light/dark)
- Full dependency list: section-badge, section-cta, SectionBackground, accordion

### Task 2: Write Rewritten README.md

**File:** Modify `src/components/marketing/benefits/README.md`

Sections to include (all verified from Task 1):

1. **Header** — title, scope, purpose
2. **Structure** — file tree (keep existing, verified correct)
3. **Usage** — import + page.tsx context (position: after Hero, before PricingTeaser)
4. **Exports** — from index.ts (verified correct)
5. **Section Anatomy** — FIX: replace fake CSS classes with actual structure (DiagonalStripes, DottedPattern, grid-cols-16, col-span-12/col-start-3, h-[100svh], isolate, --section-bg-alt)
6. **Komponen dan Tanggung Jawab** — FIX: BenefitsBadge delegates to SectionBadge, BenefitsTitle uses text-narrative (Geist Sans), DocsCTA delegates to SectionCTA. REMOVE click-outside claim.
7. **Perilaku Ringkas** — FIX: remove click-outside. Keep single-open + collapsible.
8. **Responsive Behavior** — keep (verified correct)
9. **Styling** — MAJOR REWRITE: replace all wrong tokens. Desktop: bg-transparent, hover:bg-slate-50, border-hairline, rounded-shell, text-narrative, text-interface. Mobile: rounded-md, border-hairline, hover:bg-slate-200. Dots: bg-amber-500 (not bg-dot). Section: --section-bg-alt.
10. **Konten** — benefit table (verified correct)
11. **Client Components** — NEW: only BenefitsAccordion
12. **Dependencies** — FIX: add section-badge, section-cta, SectionBackground

### Task 3: Review & Verify

Cross-check every claim in the new README against source files. Confirm 24/24 gaps closed.
