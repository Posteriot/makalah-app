# Pricing Teaser README Rewrite Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite `src/components/marketing/pricing-teaser/README.md` to close all 25 gaps (9 wrong + 16 missing).

**Architecture:** Single-file documentation rewrite. Parallel agents verify source code, then merge into final README + styling doc.

**Tech Stack:** Markdown documentation only. No code changes.

---

### Task 1: Parallel Research

**Agent A — Layout, Background, Data Flow:**
- PricingTeaser.tsx: section wrapper, grid, background components, data transform
- TeaserSkeleton.tsx: skeleton structure, styling
- page.tsx: position in page flow

**Agent B — Component Details:**
- PricingTeaserBadge → SectionBadge delegation
- PricingTeaserTitle → actual classes
- TeaserCard → full styling (dot, highlight tag, border, lift, min-height)
- TeaserCTA → SectionCTA delegation
- Client vs server components

**Agent C — Carousel & Dependencies:**
- TeaserCarousel → pointer events, capture, dots styling, slide max-width
- Full dependency list
- Verify backgroundPatterns.ts removal

### Task 2: Write README + Styling Doc
### Task 3: Verify all 25 gaps closed
