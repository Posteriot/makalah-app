# About Page Styling Extraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ekstrak seluruh styling CSS/Tailwind dari halaman about marketing ke markdown reference file.

**Architecture:** Single markdown file, 27 sections, data-driven dari analisis kode aktual. Bahasa Indonesia, English untuk istilah teknis.

**Output:** `docs/tailwind-styling-consistency/about-page/about-page-style.md`

**Reference pattern:** `docs/tailwind-styling-consistency/home-hero/home-hero-style.md`

---

## Task 1-3: Header + Section 1-10 (File table, Page wrapper, ManifestoSection wrapper, Background layers, Container, Grid, Left column, h1, Subheading, ManifestoTerminalPanel)

Read source files:
- `src/components/about/ManifestoSection.tsx`
- `src/components/about/ManifestoTerminalPanel.tsx`
- `src/components/marketing/SectionBackground/GridPattern.tsx`
- `src/components/marketing/SectionBackground/DiagonalStripes.tsx`
- `src/components/marketing/SectionBackground/DottedPattern.tsx`
- `src/components/ui/section-badge.tsx`

Extract all class strings, build Property/Class/Value tables.

---

## Task 4-6: Section 11-17 (ManifestoMobileAccordion, ProblemsSection wrapper/background/cards/hover, AgentsSection wrapper/background/grid)

Read source files:
- `src/components/about/ManifestoMobileAccordion.tsx`
- `src/components/about/ProblemsSection.tsx`
- `src/components/about/AgentsSection.tsx`
- `src/components/ui/collapsible.tsx`

Include shared component styling with full source attribution.

---

## Task 7-8: Section 18-23 (AgentTeaserCard, AgentsTeaserCarousel, CareerContactSection wrapper/cards/content, AccordionAbout)

Read source files:
- `src/components/about/AgentsSection.tsx`
- `src/components/about/CareerContactSection.tsx`
- `src/components/about/AccordionAbout.tsx`
- `src/components/ui/badge.tsx`

Document hover states, dark mode variants, responsive breakpoints.

---

## Task 9: Section 24-27 + Review + Commit (SectionBadge shared styling, Badge shared styling, Design tokens, Mobile vs Desktop comparison)

Compile all custom CSS classes, CSS variables, animations used.
Build mobile vs desktop comparison table.
Review for completeness and consistency with reference pattern.

Commit:
```bash
git add docs/tailwind-styling-consistency/about-page/about-page-style.md
git add docs/plans/2026-02-11-about-styling-extraction.md
git commit -m "docs: extract about page styling (27 sections)"
```
